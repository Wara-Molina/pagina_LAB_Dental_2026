import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { SobreNosotros } from "@/components/sobre-nosotros"
import { EventosHome} from "@/components/eventos_home"
import { AutoridadesHome } from "@/components/cursos_home"
import { VideoHome } from "@/components/videoHome"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <SobreNosotros />
      <EventosHome />
      <VideoHome />
      <AutoridadesHome />
      <Footer />
    </main>
  )
}
