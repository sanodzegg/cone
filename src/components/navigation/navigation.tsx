import LogoDark from "@/assets/logo.svg";
import LogoLight from "@/assets/logo-bw.svg";
import { ThemeToggle } from "../theme/theme-toggle";
import { Button } from "../ui/button";
import { NavLink, useLocation } from "react-router-dom";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "../ui/navigation-menu";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const links = [
    { path: '/', label: 'Convert' },
    { path: '/settings', label: 'Settings' },
]

const extensions: { title: string; href: string; }[] = [
    {
        title: 'Favicon',
        href: '/extensions/favicon'
    },
    {
        title: 'Image Editor',
        href: '/extensions/image-editor'
    },
]

function ExtensionListItem({
    title,
    href,
}: { title: string; href: string }) {
    return (
        <li>
            <NavLink to={href}>
                {({ isActive }) => (
                    <NavigationMenuLink
                        render={<span />}
                        active={isActive}
                        className={`p-1 px-2 rounded-md block text-sm transition-colors ${isActive ? 'font-medium text-primary' : 'font-normal text-muted-foreground hover:text-foreground'}`}
                    >
                        {title}
                    </NavigationMenuLink>
                )}
            </NavLink>
        </li>
    )
}

export default function Navigation() {
    const { pathname } = useLocation()
    const isExtensionActive = pathname.startsWith('/extensions')

    return (
        <section className="border-b border-b-gray-200 dark:border-b-gray-50/10">
            <div className="flex items-center justify-between py-2.5 max-w-5xl mx-auto px-10">
                <div className="flex items-center justify-center gap-x-2 shrink-0">
                    <img src={LogoLight} alt="toWEBP logo" className="h-13 w-13 dark:hidden" />
                    <img src={LogoDark} alt="toWEBP logo" className="h-13 w-13 hidden dark:block" />
                    <h1 className="text-2xl text-black dark:text-white">FileConvert</h1>
                </div>

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

                            <NavigationMenuItem>
                                <NavigationMenuTrigger className="p-0 bg-transparent hover:bg-transparent data-popup-open:bg-transparent data-open:bg-transparent focus:bg-transparent focus:outline-none focus-visible:outline-none focus-visible:ring-0 h-auto [&>svg]:hidden">
                                    <Button variant={isExtensionActive ? 'default' : 'outline'} className="font-normal dark:border-secondary pointer-events-none gap-1">
                                        Extensions
                                        <ChevronDown className="size-3 transition-transform duration-300 group-data-popup-open/navigation-menu-trigger:rotate-180 group-data-open/navigation-menu-trigger:rotate-180" />
                                    </Button>
                                </NavigationMenuTrigger>
                                <NavigationMenuContent className={'p-1!'}>
                                    <ul className="flex flex-col w-25">
                                        {extensions.map((ext) => (
                                            <ExtensionListItem key={ext.href} title={ext.title} href={ext.href} />
                                        ))}
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>

                            <NavigationMenuItem className={'pointer-events-none'} aria-disabled>
                                <NavLink to="/history">
                                    {() => (
                                        <Button disabled variant="outline" className="font-normal dark:border-secondary">
                                            History
                                        </Button>
                                    )}
                                </NavLink>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                    </NavigationMenu>
                </nav>

                <ThemeToggle />
            </div>
        </section>
    )
}
