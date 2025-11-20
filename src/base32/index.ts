/*
 * Note: for < 5 bytes, for-short is faster, however the overhead of checking the
 * length and calling another function is not worth it.
 *
 */
export * from "./for-long";
