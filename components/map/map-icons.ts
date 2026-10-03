"use client";

import L from "leaflet";

export function createPinIcon(
  label: string,
  bgColor: string,
  size = 32
): L.DivIcon {
  return L.divIcon({
    className: "agl-pin-icon",
    html: `<div style="background:${bgColor};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:${size * 0.45}px;line-height:1">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function createDotIcon(color: string, size = 22): L.DivIcon {
  return L.divIcon({
    className: "agl-dot-icon",
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}
