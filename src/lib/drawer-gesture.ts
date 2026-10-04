export function drawerOwnsGesture({
  distanceY,
  scrollTop,
  canScroll,
  expanded,
}: {
  distanceY: number;
  scrollTop: number;
  canScroll: boolean;
  expanded: boolean;
}) {
  if (!canScroll || !expanded) return true;
  return scrollTop <= 0 && distanceY > 0;
}

export function shouldDismissDrawer(distanceY: number, visibleHeight: number) {
  return visibleHeight > 0 && distanceY >= Math.min(240, visibleHeight / 2);
}
