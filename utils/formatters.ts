import { formatUnits, getAddress, parseUnits, type BigNumberish } from "ethers";
import { BaseError } from "viem";

export function shortenAddress(address: string, chars = 3): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-3)}`;
}

/**
 * Formats a value with a currency code to a currency string.
 * @param value Value to format.
 * @param currency Currency code.
 * @returns Formatted value.
 *
 * Example:
 * formatFiat(1000, "USD") => "$1,000.00"
 */
export const formatFiat = function (value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
};

/**
 * Formats a value in wei to a string with a fixed number of decimals.
 * @param value Value in wei.
 * @param decimals Number of decimals of the token.
 * @param decimalsToShow Number of decimals to show in the formatted value. Default is 6.
 * @returns An array with the formatted value and the raw value as strings.
 *
 * Example:
 * formatTokenBalance(1000000000000000000, 18, 6)
 * => ["1.000000", "1000000000000000000"]
 */
export const formatTokenBalance = function (
  value: BigNumberish,
  decimals: number,
  decimalsToShow = 6
): [string, string] {
  const bigValue = BigInt(value);
  const floatBalance = parseFloat(formatUnits(bigValue, decimals));

  return [floatBalance.toFixed(decimalsToShow), floatBalance.toString()];
};

export function parseTokenAmount(amount: BigNumberish, decimals: number): string {
  const result = formatUnits(amount.toString(), decimals).toString();
  if (result.endsWith(".0")) {
    return result.slice(0, -2);
  }
  return result;
}

export function decimalToBigNumber(amount: string, decimals: number) {
  return parseUnits(amount, decimals);
}

export function formatRawTokenPrice(amount: BigNumberish, decimals: number, price: number): number {
  const tokenAmount = parseTokenAmount(amount, decimals);
  return parseFloat(tokenAmount) * price;
}
export function formatPricePretty(price: number): string {
  if (!price) {
    return "$0.00";
  } else if (price < 0.01) {
    return "<$0.01";
  }
  return "$" + price.toFixed(2);
}
export function formatTokenPrice(amount: BigNumberish, decimals: number, price: number): string {
  return formatPricePretty(formatRawTokenPrice(amount, decimals, price));
}

/* Might return value like "0.0000" */
export function removeSmallAmount(
  amount: BigNumberish,
  decimals: number,
  price: number,
  minTokenValue = 0.001,
  maxChars = 6
): string {
  const tokenAmount = parseTokenAmount(amount, decimals);
  // eslint-disable-next-line prefer-const
  let [whole, fractional] = tokenAmount.split(".");
  if (!fractional) {
    fractional = "0";
  }
  if (whole.length > maxChars) {
    return whole;
  }

  let acc = whole + ".";
  for (let a = 0; a < fractional.length; a++) {
    const currentDecimalAmount = "0." + "".padEnd(a, "0") + "9";
    const currentPrice = parseFloat(currentDecimalAmount) * price;
    if (currentPrice >= minTokenValue || acc.length + 1 < maxChars) {
      acc += fractional[a];
    } else {
      break;
    }
  }
  if (acc.endsWith(".0")) {
    return acc.slice(0, -2);
  } else if (acc.endsWith(".")) {
    return acc.slice(0, -1);
  }
  return acc;
}

/* Fixes value like "0.0000" with "<0.0001" */
export function removeSmallAmountPretty(
  amount: BigNumberish,
  decimals: number,
  price: number,
  minTokenValue?: number,
  maxChars?: number
): string {
  if (BigInt(amount) === 0n) {
    return "0";
  }
  const withoutSmallAmount = removeSmallAmount(amount, decimals, price, minTokenValue, maxChars);
  if (isOnlyZeroes(withoutSmallAmount)) {
    return `<${withoutSmallAmount.slice(0, -1)}1`;
  }
  return withoutSmallAmount;
}

export function checksumAddress(address: string) {
  return getAddress(address);
}

export function formatError(error?: Error) {
  if (!error?.message) {
    if (typeof error === "object" && (error as any).code === 4001) {
      return undefined;
    }
    error = Object.assign(new Error("Unknown error"), error);
  }
  const message = error?.message;
  if (typeof message === "string") {
    if (
      message.includes("User denied") ||
      message.includes("User rejected") ||
      message.includes("Rejected by user") ||
      // eslint-disable-next-line quotes
      message.includes('"Request rejected"') ||
      message.includes("user rejected transaction") ||
      message.includes("not configured for connector")
    ) {
      return undefined;
    } else if (message.toLowerCase().includes("fee is to low")) {
      return new Error("Transaction fee was to low. Try again.");
    } else if (
      message === "Network Error" ||
      message === "Failed to fetch ()" ||
      message.includes("<no response> Failed to fetch") ||
      message.includes("noNetwork") ||
      (error instanceof BaseError && error?.details?.startsWith("Failed to fetch"))
    ) {
      return new Error("Network error. Check your internet connection and try again.");
    } else if (message.includes("missing response")) {
      return new Error("Server error. Please try again later.");
    } else if (
      // eslint-disable-next-line quotes
      message.includes('"finalizeEthWithdrawal" reverted with the following reason: xx') ||
      // eslint-disable-next-line quotes
      message.includes('"finalizeWithdrawal" reverted with the following reason: xx')
    ) {
      return new Error("Withdrawal is already finalized!");
    }
  }
  return error;
}
