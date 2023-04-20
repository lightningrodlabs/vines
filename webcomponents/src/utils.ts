

/** */
export function getInitials(nickname: string): string {
  const names = nickname.split(' ');
  let initials = names[0].substring(0, 1).toUpperCase();
  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase();
  } else {
    initials += names[0].substring(1, 2);
  }
  return initials;
}
