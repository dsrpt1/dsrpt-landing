export const metadata = {
  title: "DSRPT",
  description: "DSRPT main site",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
