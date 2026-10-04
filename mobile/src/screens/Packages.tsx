import Client from "./Client";

// Use the live catalog and purchase UI; never fall back to the old demo catalog.
export default function Packages() {
  return <Client initialRoute="/packages" />;
}
