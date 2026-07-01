const weakPasswordPattern = /^(?:admin|password|12345678|123456789|rsstore)$/i;

export function isStrongPassword(password: string): boolean {
  return password.length >= 12 && !weakPasswordPattern.test(password);
}
