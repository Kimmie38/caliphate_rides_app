import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { RouteSummary } from "../../components/PlaceRow";
import { Button, Txt } from "../../components/ui";
import { Ring, Tag } from "../../components/visual";
import { haversineKm, type LatLng } from "../../lib/geo";
import { isInApp, paymentOption } from "../../lib/payments";
import { formatNaira } from "../../lib/pricing";
import { fonts } from "../../theme/tokens";
import type { RideRequest } from "../types";

/** A new ride request: what the trip pays, how the rider pays, and how far the pickup is. */
export function RequestCard({ request, from, onAccept, onDecline, accepting }: {
  request: RideRequest; from: LatLng; onAccept: () => void; onDecline: () => void; accepting: boolean;
}) {
  // Time to answer, measured from when the card first appeared.
  const [total] = useState(() => Math.max(1000, request.expiresAt - Date.now()));
  const [left, setLeft] = useState(Math.max(0, request.expiresAt - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, request.expiresAt - Date.now())), 250);
    return () => clearInterval(t);
  }, [request.expiresAt]);

  const pickupKm = haversineKm(from, request.pickup.location) * 1.3;
  const pickupMin = Math.max(1, Math.round((pickupKm / 20) * 60));
  const pay = paymentOption(request.paymentMethod);
  const inApp = isInApp(request.paymentMethod);

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Ring value={left / total} size={60} label={String(Math.ceil(left / 1000))} />
        <View style={{ flex: 1 }}>
          <Txt variant="title">New {request.rideType === "keke" ? "keke" : "car"} request</Txt>
          <Txt variant="caption" color="muted" style={{ fontFamily: fonts.bodySemi }}>{request.rider.name.split(" ")[0]} · ★ {request.rider.rating.toFixed(1)}</Txt>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 42, lineHeight: 46, letterSpacing: -1.4 }} tabular>{formatNaira(request.fare)}</Txt>
          <Txt variant="caption" color="muted" tabular style={{ fontFamily: fonts.bodySemi }}>{request.distanceKm.toFixed(1)} km × {formatNaira(request.ratePerKm)} · about {request.durationMin} min</Txt>
        </View>
        <Tag text={inApp ? `Paid in app · ${pay.label}` : pay.id === "cash" ? "Collect cash" : "Transfer to you"} tone={inApp ? "green" : "amber"} icon={pay.icon} />
      </View>

      <RouteSummary from={request.pickup.name} fromDetail={`${pickupKm.toFixed(1)} km from you · ${pickupMin} min`} to={request.destination.name} toDetail={request.destination.subtitle} />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Decline" variant="quiet" onPress={onDecline} style={{ flex: 1 }} />
        <Button title="Accept" onPress={onAccept} loading={accepting} style={{ flex: 2 }} />
      </View>
    </View>
  );
}
