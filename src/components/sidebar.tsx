// import Image from "next/image";
// import { Button } from "./ui/button";
// import { SidebarButton } from "./sidebarButton";
// import { Bell, Home, Search, UserPlus } from "lucide-react";
// import { UserButton } from "@clerk/nextjs";
// import { ScrollArea } from "./ui/scroll-area";
// import Link from "next/link";


// export function Sidebar() {
//   const sidebarButtonData = [
//     {
//       routeName: "Home",
//       icon: Home,
//       href: "/dashboard/home",
//     },
//     {
//       routeName: "Search",
//       icon: Search,
//       href: "/dashboard/search",
//     },
//     {
//       routeName: "Notification",
//       icon: Bell,
//       href: "/dashboard/notification",
//     },
//     {
//       routeName: "Follow Users",
//       icon: UserPlus,
//       href: "/dashboard/connect",
//     },
//     {
//       routeName: "Cognition",
//       icon: "/cognition.png",
//       href: "/dashboard/cognition",
//     },
//   ];
//   return (
//     <div className="w-20 bg-amber-300 h-screen border-r-4 border-black flex flex-col items-center shadow-[8px_0_0_0_rgba(0,0,0,1)] z-50 relative">
//       <Link href="/dashboard">
//         <div className="pt-6 pb-4 shrink-0">
//           <Button variant="neutral" className="h-fit w-fit p-2">
//             <Image src="/logo.svg" alt="logo" height={30} width={30} />
//           </Button>
//         </div>
//       </Link>

//       <div className="flex-1 w-full overflow-hidden">
//         <ScrollArea className="h-full w-full">
//           <div className="flex flex-col items-center gap-4 px-2 pb-4">
//             {sidebarButtonData.map((item) => (
//               <SidebarButton
//                 key={item.routeName}
//                 routeName={item.routeName}
//                 icon={item.icon}
//                 href={item.href}
//               />
//             ))}
//           </div>
//         </ScrollArea>
//       </div>

//       <div className="pb-6 pt-4 shrink-0">
//         <Button variant="neutral" className="h-fit w-fit p-2">
//           <UserButton
//             appearance={{
//               elements: {
//                 userButtonAvatarBox: "border-2 border-black rounded-sm",
//               },
//             }}
//           />
//         </Button>
//       </div>
//     </div>
//   );
// }
