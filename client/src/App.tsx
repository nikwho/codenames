import { useEffect, useState } from "react";
import { HomePage } from "./pages/HomePage";
import { RoomPage } from "./pages/RoomPage";

function getRoute() {
  const match = window.location.pathname.match(/^\/room\/([^/]+)$/);
  return match ? { page: "room" as const, roomId: match[1].toUpperCase() } : { page: "home" as const };
}

export function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const onPopState = () => setRoute(getRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState(null, "", path);
    setRoute(getRoute());
  };

  if (route.page === "room") {
    return <RoomPage roomId={route.roomId} navigate={navigate} />;
  }

  return <HomePage navigate={navigate} />;
}
