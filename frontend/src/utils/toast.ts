// Central notification utility — every part of the app should import `toast`
// from here (never straight from 'sonner') so the underlying library stays a
// one-line swap if it ever needs to change.
export { toast } from 'sonner';
