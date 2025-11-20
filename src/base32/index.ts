/*
 * Note: for < 5 bytes, linus-unnebaeck is faster, however the overhead of
 * checking the length and calling another function is not worth it.
 */
export * from "./algorithms/sonnet-4.5";
