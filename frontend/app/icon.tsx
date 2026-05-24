import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#1e2235",
          borderRadius: "8px",
          display: "flex",
          fontSize: 24,
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#52b788",
            borderRadius: "70% 0 70% 70%",
            height: 22,
            transform: "rotate(-45deg)",
            width: 18,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
