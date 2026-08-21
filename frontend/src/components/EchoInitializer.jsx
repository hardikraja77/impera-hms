import { useEchoConnection } from '../hooks/useEcho';

export default function EchoInitializer() {
  useEchoConnection();
  return null;
}
