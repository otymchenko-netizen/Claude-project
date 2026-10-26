import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1>Checkout Demo</h1>
      <p className="muted">Pick a few products and place a stubbed order.</p>
      <Link href="/checkout" className="button">
        Go to checkout
      </Link>
    </>
  );
}
