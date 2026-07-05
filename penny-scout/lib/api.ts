/**
 * Standardized API response utilities
 *
 * Provides consistent response formatting across all API routes.
 * Simplifies error handling and response standardization.
 */

import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  requestId?: string;
}

/**
 * Generate a successful API response
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: Date.now(),
    },
    { status }
  );
}

/**
 * Generate an error API response
 */
export function errorResponse(
  error: string | Error,
  status = 500,
  requestId?: string
): NextResponse<ApiResponse> {
  const message = error instanceof Error ? error.message : error;
  console.error(`[${status}] ${message}${requestId ? ` [${requestId}]` : ""}`);

  return NextResponse.json(
    {
      success: false,
      error: message,
      timestamp: Date.now(),
      requestId,
    },
    { status }
  );
}

/**
 * Validate Bearer token from Authorization header
 */
export function validateBearerToken(
  authHeader: string | null,
  expectedToken: string | undefined
): boolean {
  if (!authHeader || !expectedToken) return false;
  const [scheme, token] = authHeader.split(" ");
  return scheme === "Bearer" && token === expectedToken;
}

/**
 * Extract and log request metadata
 */
export function captureRequest(req: Request) {
  const method = req.method;
  const url = new URL(req.url);
  const path = url.pathname;
  const timestamp = new Date().toISOString();

  return { method, path, url: url.toString(), timestamp };
}
