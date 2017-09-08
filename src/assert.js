export default function(invariant, message) {
  if (!invariant) {
    throw new Error(message);
  }
}
