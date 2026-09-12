import { useState } from "react";

import {
  createSIWEMessage,
  getSIWENonce,
  verifySIWE,
} from "../services/auth";

interface AuthState {
  authenticated: boolean;
  address: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    address: null,
    loading: false,
    error: null,
  });

  async function prepareSIWE(address: string) {
    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const { nonce } = await getSIWENonce(address);

      const message = await createSIWEMessage({
        domain: window.location.host,
        address,
        uri: window.location.origin,
        chain_id: 80002,
        nonce,
        issued_at: new Date().toISOString(),
      });

      return {
        nonce,
        message: message.message,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication failed";

      setState((current) => ({
        ...current,
        loading: false,
        error: message,
      }));

      throw error;
    }
  }

  async function completeSIWE(
    address: string,
    nonce: string,
    message: string,
    signature: string,
  ) {
    try {
      const result = await verifySIWE({
        address,
        nonce,
        message,
        signature,
      });

      localStorage.setItem("trustmesh_session_id", result.session_id);
      localStorage.setItem("trustmesh_wallet_address", result.address);

      setState({
        authenticated: result.authenticated,
        address: result.address,
        loading: false,
        error: null,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Authentication failed";

      setState((current) => ({
        ...current,
        loading: false,
        error: errorMessage,
      }));

      throw error;
    }
  }

  return {
    ...state,
    prepareSIWE,
    completeSIWE,
  };
}