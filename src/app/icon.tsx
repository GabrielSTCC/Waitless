import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A1B3F",
          borderRadius: 8,
        }}
      >
        <svg viewBox="0 0 32 32" width="32" height="32">
          <path
            d="M6 22L9.5 10L13 18.5L16.5 10L20 18.5L23.5 10L27 22H24L21.5 14.5L18 22H15L11.5 14.5L9 22H6Z"
            fill="#FF6600"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
