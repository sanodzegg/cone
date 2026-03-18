import Logo from "@/assets/logo.svg";
import { ThemeToggle } from "../theme/theme-toggle";
import { Button } from "../ui/button";
import { NavLink } from "react-router-dom";

export default function Navigation() {
    const links = [
        { path: '/', label: 'Convert', disabled: false },
        { path: '/settings', label: 'Settings', disabled: false },
        { path: '/history', label: 'History', disabled: true }
    ]
    return (
        <section className="border-b border-b-gray-200 dark:border-b-gray-50/10">
            <div className="flex items-center justify-between py-2.5 max-w-5xl mx-auto px-10">
                <div className="flex items-center justify-center gap-x-2 shrink-0">
                    <img src={Logo} alt="toWEBP logo" className="h-13 w-13" />
                    <h1 className="text-2xl text-black dark:text-white">FileConvert</h1>
                </div>
                <nav className="w-full flex justify-end mr-10">
                    <ul className="flex items-center gap-x-4">
                        {links.map((link, index) => (
                            <li key={index}>
                                {link.disabled ? (
                                    <Button disabled variant="outline" className="font-normal dark:border-secondary">
                                        {link.label}
                                    </Button>
                                ) : (
                                    <NavLink to={link.path}>
                                        {({ isActive }) => (
                                            <Button variant={isActive ? 'default' : 'outline'} className="font-normal dark:border-secondary">
                                                {link.label}
                                            </Button>
                                        )}
                                    </NavLink>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>
                <ThemeToggle />
            </div>
        </section>
    )
}
