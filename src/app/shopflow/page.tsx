import { getShopFlowScenario } from "@/demo/shopflow";
import { ShopFlowCheckout } from "./shopflow-checkout";

type ShopFlowPageProps = {
  searchParams: Promise<{
    state?: string;
    scenario?: string;
  }>;
};

export default async function ShopFlowPage({ searchParams }: ShopFlowPageProps) {
  const params = await searchParams;
  const scenario = getShopFlowScenario(params.state ?? params.scenario);

  return <ShopFlowCheckout scenario={scenario} />;
}
