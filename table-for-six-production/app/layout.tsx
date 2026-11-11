import './globals.css';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'Table for Six · QueerMCR',description:'Less swiping. More yapping. Sapphic friendships, dinners and plans in Manchester.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
