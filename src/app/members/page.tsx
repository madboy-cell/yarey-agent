import { redirect } from "next/navigation"

// The /members portal has been consolidated into /guest
// Redirect all traffic to the guest app
export default function MembersRedirect() {
    redirect("/guest")
}
