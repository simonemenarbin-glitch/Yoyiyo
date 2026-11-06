import assert from "node:assert/strict";

function roundSellTens(value) {
  return Math.round(value / 10) * 10;
}
function agencyNetFromCost(netCost, toCommissionPct) {
  return Math.round(netCost * (1 + toCommissionPct / 100) * 100) / 100;
}
function suggestedSellFromAgencyNet(agencyNet, partnerMarkupPct) {
  return roundSellTens(agencyNet * (1 + partnerMarkupPct / 100));
}
function pickPartnerLists(lists, opts) {
  const active = lists.filter((l) => l.active);
  const forPartner = active.filter((l) => l.partnerId === opts.partnerId);
  if (forPartner.length) return forPartner;
  if (opts.netId) {
    const forNet = active.filter((l) => l.netId === opts.netId && !l.partnerId);
    if (forNet.length) return forNet;
  }
  return active.filter((l) => !l.partnerId && !l.netId);
}

const agencyNet = agencyNetFromCost(100, 12);
assert.equal(agencyNet, 112);
assert.equal(suggestedSellFromAgencyNet(agencyNet, 10), 120);

const lists = [
  { id: "1", partnerId: "p1", netId: "n1", active: true },
  { id: "2", partnerId: null, netId: "n1", active: true },
  { id: "3", partnerId: null, netId: null, active: true },
];
assert.equal(pickPartnerLists(lists, { partnerId: "p1", netId: "n1" })[0].id, "1");
assert.equal(pickPartnerLists(lists, { partnerId: "other", netId: "n1" })[0].id, "2");

console.log("b2b pricing tests OK");
