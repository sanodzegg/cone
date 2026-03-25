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

const links = [
    { path: '/', label: 'Convert' },
    { path: '/settings', label: 'Settings' },
]

export default function Navigation() {
    return (
        <section className="border-b border-b-gray-200 dark:border-b-gray-50/10">
            <div className="flex items-center justify-between py-2.5 max-w-5xl mx-auto px-10">
                <NavLink to={'/'} className="flex items-center justify-center gap-x-1 shrink-0">
                    <img src={LogoLight} alt="Cone logo" className="select-none pointer-events-none h-8 w-8 dark:hidden" />
                    <img src={LogoDark} alt="Cone logo" className="select-none pointer-events-none h-8 w-8 hidden dark:block" />
                    <h1 className="text-4xl text-black dark:text-white">Cone</h1>
                </NavLink>

                <nav className="w-full flex justify-end mr-10">
                    <NavigationMenu>
                        <NavigationMenuList className="gap-x-4">
                            {links.map((link) => (
                                <NavigationMenuItem key={link.path}>
                                    <NavLink to={link.path}>
                                        {({ isActive }) => (
                                            <NavigationMenuLink
                                                render={<span />}
                                                active={isActive}
                                                className={cn(navigationMenuTriggerStyle(), "p-0 bg-transparent hover:bg-transparent focus:bg-transparent data-active:bg-transparent")}
                                            >
                                                <Button variant={isActive ? 'default' : 'outline'} className="font-normal dark:border-secondary pointer-events-none">
                                                    {link.label}
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
