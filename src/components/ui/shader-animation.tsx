"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

const VERTEX_SHADER = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

/** Ondas orgânicas — paleta clara/escura via uniform uDark. */
const FRAGMENT_SHADER = `
  #define TWO_PI 6.2831853072
  #define PI 3.14159265359

  precision highp float;

  uniform vec2 resolution;
  uniform float time;
  uniform float uDark;

  void main(void) {
    vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
    float t = time * 0.05;
    float lineWidth = 0.004;

    vec3 ripple = vec3(0.0);
    for (int j = 0; j < 3; j++) {
      for (int i = 0; i < 5; i++) {
        ripple[j] += lineWidth * float(i * i) / abs(
          fract(t - 0.01 * float(j) + float(i) * 0.01) * 5.0
          - length(uv)
          + mod(uv.x + uv.y, 0.2)
        );
      }
    }

    vec3 base = mix(vec3(0.973, 0.976, 0.980), vec3(0.039, 0.106, 0.247), uDark);
    vec3 orange = vec3(1.0, 0.4, 0.0);
    vec3 accentG = mix(vec3(0.039, 0.106, 0.247), vec3(0.659, 0.722, 0.816), uDark);
    vec3 peach = mix(vec3(1.0, 0.878, 0.8), vec3(1.0, 0.8, 0.6), uDark);

    float orangeStrength = mix(1.2, 1.5, uDark);
    float gStrength = mix(0.5, 0.45, uDark);
    float bStrength = mix(0.6, 0.7, uDark);
    float gClamp = mix(0.35, 0.4, uDark);
    float bClamp = mix(0.4, 0.45, uDark);

    vec3 color = base;
    color = mix(color, orange, clamp(ripple.r * orangeStrength, 0.0, 1.0));
    color = mix(color, accentG, clamp(ripple.g * gStrength, 0.0, gClamp));
    color = mix(color, peach, clamp(ripple.b * bStrength, 0.0, bClamp));
    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function enableShaderErrorLogging(renderer: import("three").WebGLRenderer) {
  if (process.env.NODE_ENV === "production") return;
  renderer.debug.checkShaderErrors = true;
}

function StaticFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 bg-gradient-to-br from-primary/[0.14] via-primary-container/40 to-brand-navy/[0.1]",
        "dark:from-primary/25 dark:via-brand-navy dark:to-surface-dim",
        className,
      )}
      aria-hidden
    />
  );
}

interface ShaderAnimationProps {
  className?: string;
  /** Quando false, congela o frame (reduced motion) sem desligar o WebGL. */
  animate?: boolean;
}

type ShaderUniforms = {
  time: { value: number };
  resolution: { value: import("three").Vector2 };
  uDark: { value: number };
};

export function ShaderAnimation({ className, animate = true }: ShaderAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<ShaderUniforms | null>(null);
  const [failed, setFailed] = useState(false);
  const animateRef = useRef(animate);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isDarkRef = useRef(isDark);

  animateRef.current = animate;
  isDarkRef.current = isDark;

  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.uDark.value = isDark ? 1.0 : 0.0;
    }
  }, [isDark]);

  useEffect(() => {
    if (!containerRef.current || failed) return;

    const container = containerRef.current;
    let animationId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let resizeRetryId = 0;
    let renderer: import("three").WebGLRenderer | null = null;
    let geometry: import("three").PlaneGeometry | null = null;
    let material: import("three").ShaderMaterial | null = null;
    let uniforms: ShaderUniforms | null = null;
    let cancelled = false;

    void import("three")
      .then((THREE) => {
        if (cancelled || !container) return;

        const camera = new THREE.Camera();
        camera.position.z = 1;

        const scene = new THREE.Scene();
        geometry = new THREE.PlaneGeometry(2, 2);

        uniforms = {
          time: { value: 1.0 },
          resolution: { value: new THREE.Vector2(1, 1) },
          uDark: { value: isDarkRef.current ? 1.0 : 0.0 },
        };
        uniformsRef.current = uniforms;

        material = new THREE.ShaderMaterial({
          uniforms,
          vertexShader: VERTEX_SHADER,
          fragmentShader: FRAGMENT_SHADER,
        });

        scene.add(new THREE.Mesh(geometry, material));

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const canvas = renderer.domElement;
        canvas.style.position = "absolute";
        canvas.style.inset = "0";
        canvas.style.display = "block";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        container.appendChild(canvas);

        enableShaderErrorLogging(renderer);
        renderer.compile(scene, camera);

        const resize = () => {
          if (cancelled || !renderer || !uniforms) return false;
          const width = container.clientWidth;
          const height = container.clientHeight;
          if (width === 0 || height === 0) return false;
          renderer.setSize(width, height, false);
          uniforms.resolution.value.set(canvas.width, canvas.height);
          return true;
        };

        const scheduleResizeRetry = () => {
          if (cancelled || resize()) return;
          resizeRetryId = window.requestAnimationFrame(scheduleResizeRetry);
        };

        resize();
        if (!resize()) scheduleResizeRetry();

        resizeObserver = new ResizeObserver(() => {
          resize();
        });
        resizeObserver.observe(container);

        const tick = () => {
          if (cancelled || !renderer || !uniforms) return;
          animationId = requestAnimationFrame(tick);
          if (animateRef.current) {
            uniforms.time.value += 0.05;
          }
          renderer.render(scene, camera);
        };
        tick();
      })
      .catch((error) => {
        console.error("[ShaderAnimation] WebGL init failed:", error);
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      uniformsRef.current = null;
      cancelAnimationFrame(animationId);
      cancelAnimationFrame(resizeRetryId);
      resizeObserver?.disconnect();
      renderer?.dispose();
      geometry?.dispose();
      material?.dispose();
      if (renderer?.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [failed]);

  if (failed) {
    return <StaticFallback className={className} />;
  }

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden bg-background", className)}
      aria-hidden
    />
  );
}
