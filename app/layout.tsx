import './globals.css';
export const metadata = { title: 'YouTube Jam', description: 'Salas de videos y listas de YouTube compartidas' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="es"><body>{children}</body></html> }
