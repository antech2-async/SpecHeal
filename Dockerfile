FROM mcr.microsoft.com/playwright:v1.60.0-noble AS deps

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

FROM mcr.microsoft.com/playwright:v1.60.0-noble AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM mcr.microsoft.com/playwright:v1.60.0-noble AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PORT=3000

COPY --from=builder --chown=pwuser:pwuser /app/.next ./.next
COPY --from=builder --chown=pwuser:pwuser /app/node_modules ./node_modules
COPY --from=builder --chown=pwuser:pwuser /app/package.json ./package.json
COPY --from=builder --chown=pwuser:pwuser /app/playwright.config.ts ./playwright.config.ts
COPY --from=builder --chown=pwuser:pwuser /app/tests ./tests
COPY --from=builder --chown=pwuser:pwuser /app/openspec ./openspec
RUN mkdir -p test-results playwright-report && chown -R pwuser:pwuser /app/test-results /app/playwright-report /app/tests

USER pwuser
EXPOSE 3000

CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
