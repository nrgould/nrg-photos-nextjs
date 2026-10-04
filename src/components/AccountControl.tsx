"use client";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useCommerceAccountEnabled } from "./CommerceProviders";
import { Button } from "./ui/button";

export function AccountControl() {
  const enabled = useCommerceAccountEnabled();
  if (!enabled) return null;
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button variant="control">Sign in</Button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </>
  );
}
