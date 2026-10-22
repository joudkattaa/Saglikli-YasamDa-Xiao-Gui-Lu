type ProfileNameSource = {
  firstName?: string | null;
  lastName?: string | null;
  unsafeMetadata?: Record<string, unknown>;
} | null | undefined;

function readName(value: unknown) {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const firstName = typeof source.firstName === 'string' ? source.firstName.trim() : '';
  const lastName = typeof source.lastName === 'string' ? source.lastName.trim() : '';
  return { firstName, lastName, fullName: [firstName, lastName].filter(Boolean).join(' ') };
}

export function getProfileName(user: ProfileNameSource) {
  for (const source of [
    user?.unsafeMetadata?.dengeProfile,
    user?.unsafeMetadata?.dengeSignupProfile,
    user,
  ]) {
    const name = readName(source);
    if (name.fullName) return name;
  }
  return readName(null);
}
