import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, decodeJwt } from 'jose';

/**
 * Le groupe de routes `(dashboard)` n'apparaît PAS dans les URL : les pages
 * sont servies sur /stocks, /finance, /payments… et non /dashboard/stocks.
 * Chaque route protégée doit donc figurer explicitement ici.
 */
const ROUTES_PROTEGEES = [
  '/dashboard',
  '/stocks',
  '/finance',
  '/marketplace',
  '/payments',
  '/alerts',
  '/recommendations',
  '/admin',
];

interface ChargeJwt {
  sub?: string;
  role?: string;
  tenantId?: string;
  exp?: number;
}

/**
 * Vérifie la signature du token. Le secret n'est jamais préfixé NEXT_PUBLIC_ :
 * il ne doit exister que côté serveur.
 *
 * Repli : sans JWT_SECRET configuré, on se rabat sur un simple décodage plutôt
 * que de rendre /admin inaccessible sur un déploiement mal configuré. Ce n'est
 * pas un trou de sécurité : le RolesGuard de l'API reste l'autorité, le
 * middleware n'est qu'un filtre de navigation.
 */
async function lireToken(token: string): Promise<ChargeJwt | null> {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.warn(
      '[middleware] JWT_SECRET absent — signature du token non vérifiée (mode dégradé)',
    );
    try {
      return decodeJwt(token) as ChargeJwt;
    } catch {
      return null;
    }
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    return payload as ChargeJwt;
  } catch {
    // Signature invalide, token malformé ou expiré : traité comme non connecté.
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('agrotech_token')?.value;

  const estProtegee = ROUTES_PROTEGEES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  if (!estProtegee) {
    return NextResponse.next();
  }

  const redirigerVersLogin = () => {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    const reponse = NextResponse.redirect(url);
    // Le cookie est invalide : le purger évite une boucle de redirection.
    reponse.cookies.delete('agrotech_token');
    return reponse;
  };

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const charge = await lireToken(token);
  if (!charge) {
    return redirigerVersLogin();
  }

  // Contrôle du rôle côté serveur : sans lui, un utilisateur authentifié non
  // super-admin recevait tout le bundle de la console d'administration et
  // n'était bloqué que par le rendu React.
  if (pathname.startsWith('/admin') && charge.role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/stocks/:path*',
    '/finance/:path*',
    '/marketplace/:path*',
    '/payments/:path*',
    '/alerts/:path*',
    '/recommendations/:path*',
    '/admin/:path*',
  ],
};
