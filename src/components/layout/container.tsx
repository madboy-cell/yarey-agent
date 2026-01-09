import * as React from "react"
import { cn } from "../ui/button"

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    as?: React.ElementType
}

export function Container({
    as: Component = "div",
    className,
    children,
    ...props
}: ContainerProps) {
    return (
        <Component
            className={cn(
                "mx-auto w-full max-w-screen-xl px-4 md:px-6 lg:px-8",
                className
            )}
            {...props}
        >
            {children}
        </Component>
    )
}
