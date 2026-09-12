import { BrowserProvider } from "ethers";

declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
    };
  }
}

export async function connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error("No Ethereum wallet detected. Please install MetaMask.");
  }

  const provider = new BrowserProvider(window.ethereum);

  await provider.send("eth_requestAccounts", []);

  const signer = await provider.getSigner();

  return signer.getAddress();
}

export async function signMessage(
  message: string,
): Promise<string> {
  if (!window.ethereum) {
    throw new Error("No Ethereum wallet detected.");
  }

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return signer.signMessage(message);
}