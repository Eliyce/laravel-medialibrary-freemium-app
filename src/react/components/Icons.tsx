/**
 * Kept for Spatie compatibility. `<Icon />` now draws each icon inline, so there is no sprite to
 * define and this renders nothing; mounting it any number of times adds no duplicate ids.
 */
export function Icons() {
  return null;
}
