import LogoDark from "@/assets/logo.svg";
import LogoLight from "@/assets/logo-bw.svg";
import { Button } from "../ui/button";
import { NavLink } from "react-router-dom";
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from "../ui/navigation-menu";
import { cn } from "@/lib/utils";
import { NavigationSecondary } from "./navigation-secondary";
import { useTheme } from "../theme/theme-provider";
import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner"

export const PRICING_DISMISSED_KEY = 'cone_pricing_tab_dismissed'

const baseLinks = [
    { path: '/', label: 'Convert' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/settings', label: 'Settings' },
]

export default function Navigation() {
    const { theme } = useTheme()
    const [pricingDismissed, setPricingDismissed] = useState(
        () => localStorage.getItem(PRICING_DISMISSED_KEY) === 'true'
    )
    const [pricingDissolving, setPricingDissolving] = useState(false)

    const links = baseLinks.filter(l => l.path !== '/pricing' || !pricingDismissed)

    function dismissPricing(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        setPricingDissolving(true)
        setTimeout(() => {
            localStorage.setItem(PRICING_DISMISSED_KEY, 'true')
            setPricingDismissed(true)
            setPricingDissolving(false)
            toast('Pricing moved to the extension tab')
        }, 800)
    }

    return (
        <section className="flex border-b border-b-gray-200 dark:border-b-gray-50/10 h-(--nav-height)">
            <div className="flex items-center justify-between py-2.5 section w-full">
                <NavLink to={'/'} className="flex items-center justify-center gap-x-1 shrink-0">
                    <img src={theme === 'dark' ? LogoDark : LogoLight} alt="Cone logo" className="select-none pointer-events-none h-8 w-8 2xl:h-12 2xl:w-12" />
                    <h1 className="text-4xl 2xl:text-5xl text-black dark:text-white">Cone</h1>
                </NavLink>

                <nav className="w-full flex justify-end mr-10">
                    <NavigationMenu>
                        <NavigationMenuList className="gap-x-4 2xl:gap-x-5">
                            {links.map((link) => (
                                <NavigationMenuItem key={link.path}>
                                    <NavLink to={link.path}>
                                        {({ isActive }) => (
                                            <NavigationMenuLink
                                                render={<span />}
                                                active={isActive}
                                                className={cn(navigationMenuTriggerStyle(), "p-0 bg-transparent hover:bg-transparent focus:bg-transparent data-active:bg-transparent")}
                                            >
                                                <Button variant={isActive ? 'default' : 'outline'} className={cn("font-normal 2xl:text-base 2xl:h-10 2xl:px-5 dark:border-secondary pointer-events-none transition-all duration-500", link.path === '/pricing' && pricingDissolving && "opacity-0 scale-75")}>
                                                    {link.label}
                                                    {link.path === '/pricing' && (
                                                        <Button variant={'ghost'} onClick={dismissPricing} className="absolute bg-muted cursor-pointer pointer-events-auto! rounded-full! p-0.5! h-fit! -top-1 -right-2 active:translate-y-0!">
                                                            <X className="text-accent-foreground" />
                                                        </Button>
                                                    )}
                                                </Button>
                                            </NavigationMenuLink>
                                        )}
                                    </NavLink>
                                </NavigationMenuItem>
                            ))}

                        </NavigationMenuList>
                    </NavigationMenu>
                </nav>

                <NavigationSecondary />
            </div>
        </section>
    )
}
