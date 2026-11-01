import { auth, currentUser } from "@clerk/nextjs/server";

// Clerk is the identity provider; the returned id is the Clerk user id and is
// the value stored in the *_clerk_id columns in Supabase.
export const checkUser = async () => {
  const user = await currentUser();

  if (!user) {
    console.log("No User found");
    return null;
  }

  // Check if user has Pro plan
  const { has } = await auth();
  const subscriptionTier = has({ plan: "head_chef" }) ? "pro" : "free";

  const email = user.emailAddresses[0]?.emailAddress || "";

  return {
    id: user.id,
    clerkId: user.id,
    username: user.username || (email ? email.split("@")[0] : ""),
    email,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    imageUrl: user.imageUrl || "",
    subscriptionTier,
  };
};
