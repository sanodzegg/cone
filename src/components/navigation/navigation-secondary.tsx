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
import { Camera, ChevronRight, FileDown, FilePlus, FolderSync, Globe, ImageIcon, LayoutGrid, PenLine, User, WifiOff } from "lucide-react";
import { useAuth } from "@/lib/useAuth";

type SimpleExtension = { kind: 'link'; title: string; description: string; href: string; icon: React.ReactNode }
type GroupExtension = { kind: 'group'; title: string; icon: React.ReactNode; children: { title: string; description: string; href: string; icon: React.ReactNode; disabled?: boolean; requiresInternet?: boolean }[] }
type Extension = SimpleExtension | GroupExtension

const extensions: Extension[] = [
    {
        kind: 'link',
        title: 'SVG Editor',
        description: 'Preview, optimize, and export SVGs as code or Data URI',
        href: '/extensions/svg-editor',
        icon: <PenLine className="size-5" />,
    },
    {
        kind: 'link',
        title: 'Favicon Generator',
        description: 'Generate a full favicon set from any image',
        href: '/extensions/favicon',
        icon: <Globe className="size-5" />,
    },
    {
        kind: 'link',
        title: 'Image Editor',
        description: 'Crop, transform, and adjust images',
        href: '/extensions/image-editor',
        icon: <ImageIcon className="size-5" />,
    },
    {
        kind: 'link',
        title: 'Bulk Converter',
        description: 'Convert all images in a folder recursively',
        href: '/extensions/bulk-converter',
        icon: <FolderSync className="size-5" />,
    },
    {
        kind: 'group',
        title: 'Web',
        icon: <Globe className="size-5" />,
        children: [
            {
                title: 'Screenshot',
                description: 'Capture full-page screenshots of any URL',
                href: '/extensions/website-screenshot',
                icon: <Camera className="size-5" />,
                requiresInternet: true,
            },
            {
                title: 'Download as PDF',
                description: 'Save any webpage as a PDF file',
                href: '/extensions/website-pdf',
                icon: <FileDown className="size-5" />,
                requiresInternet: true,
            },
        ],
    },
    {
        kind: 'group',
        title: 'PDF',
        icon: <FileDown className="size-5" />,
        children: [
            {
                title: 'Merge',
                description: 'Combine multiple PDFs into one',
                href: '/extensions/pdf-merge',
                icon: <FilePlus className="size-5" />,
            },
        ],
    }
]

export function NavigationSecondary() {
    const { pathname } = useLocation()
    const isExtensionActive = pathname.startsWith('/extensions')
    const { user } = useAuth()
    const [open, setOpen] = useState(false)
    const [expandedGroup, setExpandedGroup] = useState<string | null>(
        pathname.startsWith('/extensions/website') ? 'Web' :
            pathname.startsWith('/extensions/pdf') ? 'PDF' : null
    )
    const [isOnline, setIsOnline] = useState(navigator.onLine)

    useEffect(() => {
        const on = () => setIsOnline(true)
        const off = () => setIsOnline(false)
        window.addEventListener('online', on)
        window.addEventListener('offline', off)
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
    }, [])

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
                            className={cn("2xl:size-10", isExtensionActive && "text-primary")}
                        />
                    }
                >
                    <LayoutGrid className="size-4 2xl:size-5" />
                    <span className="sr-only">Extensions</span>
                </SheetTrigger>
                <SheetContent side="right" className="w-94 2xl:w-108 flex flex-col">
                    <SheetHeader>
                        <SheetTitle className={'font-body 2xl:text-xl'}>Extensions</SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col gap-2 p-4 pt-0 flex-1 overflow-y-auto">
                        {extensions.map((ext) => {
                            if (ext.kind === 'link') {
                                return (
                                    <NavLink key={ext.href} to={ext.href}>
                                        {({ isActive }) => (
                                            <div className={cn(
                                                "flex items-start gap-3 rounded-lg p-3 2xl:p-4 transition-colors cursor-pointer",
                                                isActive ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
                                            )}>
                                                <div className={cn("mt-0.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")}>
                                                    {ext.icon}
                                                </div>
                                                <div>
                                                    <p className="text-sm 2xl:text-base font-medium leading-none mb-1">{ext.title}</p>
                                                    <p className="text-xs 2xl:text-sm text-muted-foreground">{ext.description}</p>
                                                </div>
                                            </div>
                                        )}
                                    </NavLink>
                                )
                            }

                            const isGroupActive = ext.children.some(c => pathname === c.href)
                            const isExpanded = expandedGroup === ext.title

                            return (
                                <div key={ext.title}>
                                    <button
                                        onClick={() => setExpandedGroup(isExpanded ? null : ext.title)}
                                        className={cn(
                                            "w-full flex items-center gap-3 rounded-lg p-3 2xl:p-4 transition-colors cursor-pointer",
                                            isGroupActive ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
                                        )}
                                    >
                                        <div className={cn("shrink-0", isGroupActive ? "text-primary" : "text-muted-foreground")}>
                                            {ext.icon}
                                        </div>
                                        <span className="text-sm 2xl:text-base font-medium flex-1 text-left">{ext.title}</span>
                                        <ChevronRight className={cn("size-4 2xl:size-5 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                                    </button>
                                    {isExpanded && (
                                        <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
                                            {ext.children.map(child => {
                                                const isDisabled = child.disabled || (!isOnline && child.requiresInternet)
                                                if (isDisabled) return (
                                                    <div key={child.href} className="flex items-center gap-2.5 rounded-lg p-2.5 2xl:p-3 opacity-40 cursor-not-allowed">
                                                        <div className="shrink-0 text-muted-foreground">{child.icon}</div>
                                                        <div className="flex-1">
                                                            <p className="text-sm 2xl:text-base font-medium leading-none mb-0.5">{child.title}</p>
                                                            <p className="text-xs 2xl:text-sm text-muted-foreground">{child.description}</p>
                                                        </div>
                                                        {!isOnline && child.requiresInternet && <WifiOff className="size-4 2xl:size-5 text-destructive shrink-0" />}
                                                    </div>
                                                )
                                                return (
                                                    <NavLink key={child.href} to={child.href}>
                                                        {({ isActive }) => (
                                                            <div className={cn(
                                                                "flex items-center gap-2.5 rounded-lg p-2.5 2xl:p-3 transition-colors cursor-pointer",
                                                                isActive ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
                                                            )}>
                                                                <div className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground")}>{child.icon}</div>
                                                                <div>
                                                                    <p className="text-sm 2xl:text-base font-medium leading-none mb-0.5">{child.title}</p>
                                                                    <p className="text-xs 2xl:text-sm text-muted-foreground">{child.description}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </NavLink>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <div className="p-4 border-t border-border">
                        <NavLink to="/account">
                            {({ isActive }) => (
                                <div className={cn(
                                    "flex items-center gap-3 rounded-lg p-3 2xl:p-4 transition-colors cursor-pointer",
                                    isActive ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
                                )}>
                                    <User className={cn("size-5 2xl:size-6 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                                    <div>
                                        <p className="text-sm 2xl:text-base font-medium leading-none mb-1">Account</p>
                                        <p className="text-xs 2xl:text-sm text-muted-foreground">
                                            {user ? user.email : 'Sign in or create an account'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </NavLink>
                    </div>
                </SheetContent>
            </Sheet>

            <ThemeToggle />
        </div>
    )
}
