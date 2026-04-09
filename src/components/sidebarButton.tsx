// import { LucideIcon } from "lucide-react";
// import { Button } from "./ui/button";
// import Link from "next/link";
// import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
// import Image from "next/image";

// interface SidebarButtonProps {
//   routeName: string;
//   icon: LucideIcon | string;
//   href: string;
//   className?: string;
// }

// export function SidebarButton({
//   routeName,
//   icon,
//   href,
//   className,
// }: SidebarButtonProps) {
//   const Icon = icon as LucideIcon;
//   return (
//     <Tooltip>
//       <TooltipTrigger  className={className}>
//         <Link href={href}>
//           <Button
//             variant="default"
//             size="icon"
//             className="h-12 w-12 rounded-md bg-white text-black border-2 border-black shadow-[4px_4px_0_0_#000000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000000] transition-all hover:bg-main hover:text-white"
//           >
            
//             {typeof icon === "string" ? (
//               <Image
//                 src={icon}
//                 alt={routeName}
//                 width={20}
//                 height={20}
//                 className="h-5 w-5"
//               />
//             ) : (
//               <Icon className="h-6 w-6" />
//             )}
//           </Button>
//         </Link>
//       </TooltipTrigger>
//       <TooltipContent className="border-2 border-black shadow-[4px_4px_0_0_#000000] bg-white text-black font-bold">
//         {routeName}
//       </TooltipContent>
//     </Tooltip>
//   );
// }
