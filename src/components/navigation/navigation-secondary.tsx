import { useState, useEffect } from "react";
import { ThemeToggle } from "../theme/theme-toggle";
import { Button } from "../ui/button";
import { NavLink, useLocation } from "react-router-dom";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "../ui/sheet";
import { cn } from "@/lib/utils";
import { Camera, FolderSync, Globe, ImageIcon, LayoutGrid } from "lucide-react";

const extensions: { title: string; description: string; href: string; icon: React.ReactNode }[] = [
    {
        title: 'Favicon Generator',
        description: 'Generate a full favicon set from any image',
        href: '/extensions/favicon',
        icon: <Globe className="size-5" />,
    },
    {
        title: 'Image Editor',
        description: 'Crop, transform, and adjust images',
        href: '/extensions/image-editor',
        icon: <ImageIcon className="size-5" />,
    },
    {
        title: 'Bulk Converter',
        description: 'Convert all images in a folder recursively',
        href: '/extensions/bulk-converter',
        icon: <FolderSync className="size-5" />,
    },
    {
        title: 'Website Screenshot',
        description: 'Capture full-page screenshots of any public URL',
        href: '/extensions/website-screenshot',
        icon: <Camera className="size-5" />,
    },
]

export function NavigationSecondary() {
    const { pathname } = useLocation()
    const isExtensionActive = pathname.startsWith('/extensions')
    const [open, setOpen] = useState(false)

    useEffect(() => {
        setOpen(false)
    }, [pathname])

    return (
        <div className="flex items-center gap-x-2">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger
                    render={
                        <Button
                            variant="outline"
                            size="icon"
                            className={cn(isExtensionActive && "text-primary")}
                        />
                    }
                >
                    <LayoutGrid className="size-4" />
                    <span className="sr-only">Extensions</span>
                </SheetTrigger>
                <SheetContent side="right" className="w-94">
                    <SheetHeader>
                        <SheetTitle className={'font-body'}>Extensions</SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col gap-2 p-4 pt-0">
                        {extensions.map((ext) => (
                            <NavLink key={ext.href} to={ext.href}>
                                {({ isActive }) => (
                                    <div className={cn(
                                        "flex items-start gap-3 rounded-lg p-3 transition-colors cursor-pointer",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "hover:bg-accent text-foreground"
                                    )}>
                                        <div className={cn(
                                            "mt-0.5 shrink-0",
                                            isActive ? "text-primary" : "text-muted-foreground"
                                        )}>
                                            {ext.icon}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium leading-none mb-1">{ext.title}</p>
                                            <p className="text-xs text-muted-foreground">{ext.description}</p>
                                        </div>
                                    </div>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>

            <ThemeToggle />
        </div>
    )
}
