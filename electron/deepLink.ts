export const extractDeepLinkUrl = (argv: string[], scheme: string): string | null => {
  const prefix = `${scheme}://`;
  for (const arg of argv) {
    if (typeof arg !== "string") continue;
    if (arg.startsWith(prefix)) {
      return arg;
    }
  }
  return null;
};
