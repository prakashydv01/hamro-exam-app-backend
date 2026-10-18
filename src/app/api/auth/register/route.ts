import { connectDB } from '@/lib/mongodb';
import { ok, withErrorHandling } from '@/lib/apiResponse';
import { registerSchema, parseOrThrow } from '@/lib/validation';
import { registerUser } from '@/services/auth.service';

export const POST = withErrorHandling(async (req: Request) => {
  await connectDB();
  const body = parseOrThrow(registerSchema, await req.json());
  const result = await registerUser(body);
  // No JWT issued yet - user must verify OTP first.
  return ok(result, { status: 201 });
});
