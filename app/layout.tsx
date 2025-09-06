export const metadata = {
  title: "Dsrpt",
  description: "Dsrpt landing + pricing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
