import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

// Assume these icons are imported from an icon library
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useAppSettings } from "../context/AppSettingsContext";
import { useAuth } from "../context/AuthContext";
import SidebarWidget from "./SidebarWidget";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  permission?: string;
};

// Defined outside to be stable, or inside with useMemo. Outside is fine.
const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    subItems: [{ name: "Ecommerce", path: "/", pro: false }],
  },
  {
    icon: <CalenderIcon />,
    name: "Calendar",
    path: "/calendar",
  },
  {
    name: "Game Engine",
    icon: <ListIcon />,
    permission: "view_menu_settings",
    subItems: [
      { name: "My Credits", path: "/impact", pro: false },
      { name: "Leaderboard", path: "/leaderboard", pro: false },
      { name: "Challenges", path: "/challenges", pro: false },
      { name: "Rewards", path: "/rewards", pro: false },
      { name: "Credit Rules", path: "/credit-rules", pro: false },
    ],
  },
  {
    name: "Work Forms",
    icon: <ListIcon />,
    permission: "view_menu_pm",
    subItems: [
      { name: "Daily Status", path: "/forms/daily-status", pro: false },
      { name: "Weekly Report", path: "/forms/weekly-report", pro: false },
      { name: "Peer Review", path: "/forms/peer-review", pro: false },
      { name: "Team Update", path: "/forms/team-update", pro: false },
      { name: "Zoho Sync", path: "/zoho-integration", pro: false },
    ],
  },
  {
    icon: <UserCircleIcon />,
    name: "HR",
    permission: "view_menu_hr",
    subItems: [
      { name: "Departments", path: "/hr/departments", pro: false },
      { name: "Designations", path: "/hr/designations", pro: false },
      { name: "Employees", path: "/hr/employees", pro: false },
      { name: "Leave Types", path: "/hr/leave-types", pro: false },
    ],
  },
  {
    icon: <GridIcon />,
    name: "Project Management",
    permission: "view_menu_pm",
    subItems: [
      { name: "Projects", path: "/pm/projects", pro: false },
      { name: "All Tasks", path: "/pm/tasks", pro: false },
      { name: "Iterations", path: "/pm/iterations", pro: false, new: true },
      { name: "Sprints", path: "/pm/sprints", pro: false },
      { name: "Teams", path: "/pm/teams", pro: false },
      { name: "Roles", path: "/pm/roles", pro: false },
      { name: "Timesheets", path: "/pm/timesheets", pro: false, new: true },
      { name: "Team Timesheets", path: "/pm/team-timesheets", pro: false },
      { name: "Workflows", path: "/pm/workflows", pro: false },
    ],
  },
  {
    icon: <BoxCubeIcon />,
    name: "Tags",
    path: "/tags",
    permission: "view_menu_settings",
  },
  {
    icon: <PieChartIcon />,
    name: "Reports",
    permission: "view_menu_settings",
    subItems: [
      { name: "Report Builder", path: "/reporting/builder", pro: false },
      { name: "Dataset Builder", path: "/reporting/datasets", pro: false },
      { name: "Saved Reports", path: "/reporting/saved", pro: false },
    ],
  },
  {
    icon: <BoxCubeIcon />,
    name: "GitHub",
    subItems: [
      { name: "Dashboard", path: "/github", pro: false },
      { name: "Organizations", path: "/github/orgs", pro: false },
      { name: "Commits", path: "/github/commits", pro: false, new: true },
      { name: "Pull Requests", path: "/github/prs", pro: false },
      { name: "Repositories", path: "/github/repos", pro: false },
      { name: "Peer Review", path: "/github/reviews/new", pro: false },
    ],
  },
  {
    icon: <PlugInIcon />,
    name: "Settings",
    permission: "view_menu_settings",
    subItems: [
      { name: "General", path: "/settings", pro: false },
      { name: "Permissions", path: "/settings/permissions", pro: false },
    ],
  },
  {
    name: "Forms",
    icon: <ListIcon />,
    permission: "view_menu_settings",
    subItems: [{ name: "Form Elements", path: "/form-elements", pro: false }],
  },
  {
    name: "Tables",
    icon: <TableIcon />,
    permission: "view_menu_settings",
    subItems: [
        { name: "Basic Tables", path: "/basic-tables", pro: false },
        { name: "Advanced Table", path: "/tables/advanced", pro: false },
        { name: "Data Grid", path: "/tables/data-grid", pro: false },
    ],
  },
  {
    name: "Ui Elements",
    icon: <BoxCubeIcon />,
    permission: "view_menu_settings",
    subItems: [
      { name: "Alerts", path: "/alerts", pro: false },
      { name: "Avatars", path: "/avatars", pro: false },
      { name: "Badge", path: "/badge", pro: false },
      { name: "Buttons", path: "/buttons", pro: false },
      { name: "Images", path: "/images", pro: false },
      { name: "Videos", path: "/videos", pro: false },
    ],
  },
  {
    name: "Charts",
    icon: <PieChartIcon />,
    permission: "view_menu_settings",
    subItems: [
      { name: "Line Chart", path: "/line-chart", pro: false },
      { name: "Bar Chart", path: "/bar-chart", pro: false },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <PlugInIcon />,
    name: "Authentication",
    subItems: [
      { name: "Sign In", path: "/signin", pro: false },
      { name: "Sign Up", path: "/signup", pro: false },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, setSidebarOpen, isMobile } = useSidebar();
  const location = useLocation();
  const pathname = location.pathname;
  const { hasPermission, user } = useAuth();

  // Dynamic masters state
  const [dynamicMasters, setDynamicMasters] = useState<any[]>([]);
  const [mastersLoading, setMastersLoading] = useState(true);
  const [mastersError, setMastersError] = useState<string | null>(null);

  // App settings
  const { settings } = useAppSettings();
  const appName = settings.appName;

  // Saved Reports state
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLUListElement | null>>({});

  // Filter helper functions
  const filterMenuItems = useCallback((items: NavItem[], query: string) => {
    let filtered = items;
    // 1. Permission Filter
    filtered = filtered.filter(item => {
        if (!item.permission) return true;
        return hasPermission(item.permission);
    });

    // 2. Search Filter
    if (query) {
        const lowercaseQuery = query.toLowerCase();
        filtered = filtered.filter(item => {
            const nameMatch = item.name.toLowerCase().includes(lowercaseQuery);
            const subItemMatch = item.subItems?.some(sub =>
                sub.name.toLowerCase().includes(lowercaseQuery)
            );
            return nameMatch || subItemMatch;
        });
    }
    return filtered;
  }, [hasPermission]);

  const filterMasters = useCallback((masters: any[], query: string) => {
    if (!query) return masters;
    const lowercaseQuery = query.toLowerCase();
    return masters.filter(master =>
      master.display_name.toLowerCase().includes(lowercaseQuery) ||
      master.name.toLowerCase().includes(lowercaseQuery)
    );
  }, []);

  // Filter Nav Items with permissions for UseEffect logic
  // We need "filteredNavItems" variable for the intersection logic
  const filteredNavItems = filterMenuItems(navItems, ""); 
  const filteredOthersItems = filterMenuItems(othersItems, "");

  // isActive function to check if the menu item is active
  const isActive = useCallback(
    (path?: string) => {
        if (!path) return false;
        if (path === "/" && pathname === "/") return true;
        if (path !== "/" && pathname.startsWith(path)) return true;
        return false;
    },
    [pathname]
  );

  // Fetch dynamic masters from API
  useEffect(() => {
    const fetchMasters = async () => {
      if (!hasPermission('view_menu_masters')) {
        setMastersLoading(false);
        return;
      }
      try {
        setMastersLoading(true);
        const response = await fetch('http://192.168.1.26:8000/api/masters/masters/');
        if (!response.ok) {
          throw new Error('Failed to fetch masters');
        }
        const data = await response.json();
        setDynamicMasters(data);
        setMastersError(null);
      } catch (error) {
        console.error('Error fetching masters:', error);
        setMastersError('Failed to load masters');
        setDynamicMasters([]);
      } finally {
        setMastersLoading(false);
      }
    };

    fetchMasters();
  }, [hasPermission]);

  // Fetch Saved Reports
  useEffect(() => {
    const fetchReports = async () => {
      if (!hasPermission('view_menu_reporting')) {
        setReportsLoading(false);
        return;
      }
        try {
            setReportsLoading(true);
            const response = await fetch('http://192.168.1.26:8000/api/reporting/definitions/');
            if (response.ok) {
                const data = await response.json();
                setSavedReports(data);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setReportsLoading(false);
        }
    };
    fetchReports();
  }, [hasPermission]);


  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? filteredNavItems : filteredOthersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    // Also check dynamic masters
    if (!submenuMatched && dynamicMasters.length > 0) {
        // ... (existing logic might not cover dynamic routes easily, skipping for now)
    }

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]); // Removed filteredNavItems dependency to avoid loops

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${openSubmenu?.type === menuType && openSubmenu?.index === index
                ? "menu-item-active"
                : "menu-item-inactive"
                } cursor-pointer ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
                }`}
            >
              <span
                className={`menu-item-icon-size  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-icon-active"
                  : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text-size ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-text-active"
                  : "menu-item-text-inactive"
                  }`}>
                  {nav.name}
                </span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                    ? "rotate-180 text-brand-500"
                    : ""
                    }`}
                />
              )}
            </button>
          ) : (
            <Link
              to={nav.path || "/"}
              className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
                }`}
            >
              <span
                className={`menu-item-icon-size ${isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text-size ${isActive(nav.path) ? "menu-item-text-active" : "menu-item-text-inactive"
                  }`}>
                  {nav.name}
                </span>
              )}
            </Link>
          )}

          {/* Submenu */}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              className={`overflow-hidden transition-all duration-300 ${openSubmenu?.type === menuType && openSubmenu?.index === index
                ? "max-h-screen opacity-100"
                : "max-h-0 opacity-0"
                }`}
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul
                className="mt-2 space-y-1 ml-9"
                ref={(el) => {
                  subMenuRefs.current[`${menuType}-${index}`] = el;
                }}
              >
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                        ? "menu-dropdown-item-active"
                        : "menu-dropdown-item-inactive"
                        }`}
                    >
                      {subItem.name}
                      {subItem.pro && (
                        <span className="ml-auto text-[10px] font-medium text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">
                          Pro
                        </span>
                      )}
                      {subItem.new && (
                        <span className="ml-auto text-[10px] font-medium text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">
                          New
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col pt-5 pb-8 lg:mt-0 top-0 left-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-40 
        ${isExpanded || isHovered ? "w-[290px]" : "w-[90px]"} 
        ${isMobileOpen
          ? "translate-x-0 w-[290px]"
          : "-translate-x-full lg:translate-x-0"
        }
      `}
      onMouseEnter={() => !isMobile && setSidebarOpen(true)}
      onMouseLeave={() => !isMobile && setSidebarOpen(false)}
    >
      <div className={`px-8 pt-6 pb-6 lg:pb-8 ${!isExpanded && !isHovered ? "lg:hidden" : ""}`}>
        <Link to="/">
          <div className="flex items-center gap-3">
             <div className="flex items-center justify-center w-10.5 h-10.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/20">
               <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
               </svg>
             </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {settings.appName}
              </h1>
              <p className="text-[10px] font-medium text-gray-400 tracking-wider uppercase">{settings.appTagline}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Search Bar */}
      {(isExpanded || isHovered || isMobileOpen) && (
        <div className="px-5 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <input
              type="search"
              placeholder="Search sidebar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2 text-sm bg-gray-50 dark:bg-gray-800 
                         border border-gray-200 dark:border-gray-700 rounded-lg 
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder:text-gray-400"
            />
            <div className="absolute left-3 top-2.5 text-gray-400 pointer-events-none">
              🔍
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear h-[calc(100vh-100px)] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(filterMenuItems(navItems, searchQuery), "main")}

              {/* No results for Menu */}
              {searchQuery && filterMenuItems(navItems, searchQuery).length === 0 && (
                <div className="text-sm text-gray-400 text-center py-4">
                  No menu items found
                </div>
              )}
            </div>


            {/* Dynamic Reports Section - Permission Checked */}
            {hasPermission('view_menu_reporting') && (
            <div className="">
                <div className={`mb-4 flex items-center ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-between"}`}>
                    <h2 className="text-xs uppercase leading-[20px] text-gray-400">
                        {isExpanded || isHovered || isMobileOpen ? "Reports" : <HorizontaLDots className="size-6" />}
                    </h2>
                     {(isExpanded || isHovered || isMobileOpen) && (
                        <Link to="/reporting/builder" className="text-gray-400 hover:text-blue-600 transition-colors" title="Build New Report">
                            ➕
                        </Link>
                     )}
                </div>
                 {!reportsLoading && savedReports.length > 0 && (
                    <ul className="flex flex-col gap-4 mb-6">
                        {savedReports
                            .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .filter(r => hasPermission(`view_report_${r.report_id}`) || r.is_public || (user && r.created_by === user.member_id))
                            .map((report: any) => (
                            <li key={report.report_id}>
                                <Link
                                    to={`/reporting/view/${report.report_id}`}
                                    className={`menu-item group ${isActive(`/reporting/view/${report.report_id}`) ? "menu-item-active" : "menu-item-inactive"}`}
                                >
                                    <span className={`menu-item-icon-size text-xl ${isActive(`/reporting/view/${report.report_id}`) ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                                        📊
                                    </span>
                                    {(isExpanded || isHovered || isMobileOpen) && (
                                        <span className="menu-item-text truncate">{report.name}</span>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                 )}

            </div>
            )}

            {/* Dynamic Masters Section - Permission Checked */}
            {hasPermission('view_menu_masters') && (
            <div className="">
              <div className={`mb-4 flex items-center ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-between"}`}>
                <h2 className="text-xs uppercase leading-[20px] text-gray-400">
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Masters"
                  ) : (
                    <HorizontaLDots className="size-6" />
                  )}
                </h2>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const fetchMasters = async () => {
                          try {
                            const response = await fetch('http://192.168.1.26:8000/api/masters/masters/');
                            const data = await response.json();
                            setDynamicMasters(data);
                          } catch (error) {
                            console.error('Error refreshing masters:', error);
                          }
                        };
                        fetchMasters();
                      }}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Refresh masters"
                    >
                      🔄
                    </button>
                    <Link
                      to="/masters/visual"
                      className="text-gray-400 hover:text-green-600 transition-colors"
                      title="Visual Master Builder"
                    >
                      🛠️
                    </Link>
                    <Link
                      to="/masters/create"
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Create new master"
                    >
                      ➕
                    </Link>
                  </div>
                )}
              </div>

              {/* Loading State */}
              {mastersLoading && (
                <div className="flex flex-col gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-11 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              )}

              {/* Error State */}
              {mastersError && !mastersLoading && (
                <div className="text-xs text-red-500 text-center py-2">
                  {isExpanded || isHovered || isMobileOpen ? mastersError : "⚠️"}
                </div>
              )}

              {/* Dynamic Masters List */}
              {!mastersLoading && !mastersError && filterMasters(dynamicMasters, searchQuery).length > 0 && (
                <ul className="flex flex-col gap-4">
                  {filterMasters(dynamicMasters, searchQuery)
                    .filter((master: any) => hasPermission(`view_master_${master.name}`))
                    .map((master: any) => (
                    <li key={master.id}>
                      <Link
                        to={`/masters/data/${master.name}`}
                        className={`menu-item group ${isActive(`/masters/data/${master.name}`)
                          ? "menu-item-active"
                          : "menu-item-inactive"
                          }`}
                      >
                        <span
                          className={`menu-item-icon-size text-xl ${isActive(`/masters/data/${master.name}`)
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive"
                            }`}
                        >
                          {master.icon || "📋"}
                        </span>
                        {(isExpanded || isHovered || isMobileOpen) && (
                          <span className="menu-item-text flex items-center justify-between flex-1">
                            {master.display_name}
                            {master.record_count > 0 && (
                              <span className="ml-auto px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                {master.record_count}
                              </span>
                            )}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}


              {/* No results for Masters */}
              {!mastersLoading && !mastersError && searchQuery && filterMasters(dynamicMasters, searchQuery).length === 0 && dynamicMasters.length > 0 && (
                <div className="text-sm text-gray-400 text-center py-4">
                  No masters found for "{searchQuery}"
                </div>
              )}

              {/* Empty State */}
              {!mastersLoading && !mastersError && dynamicMasters.length === 0 && !searchQuery && (
                <div className="text-xs text-gray-400 text-center py-4">
                  {isExpanded || isHovered || isMobileOpen ? (
                    <div>
                      <p>No masters created yet</p>
                      <Link
                        to="/masters/create"
                        className="text-blue-600 hover:underline mt-1 inline-block"
                      >
                        Create one →
                      </Link>
                    </div>
                  ) : (
                    "📋"
                  )}
                </div>
              )}
            </div>
            )}

            {/* Section Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>

            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Others"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(filterMenuItems(othersItems, searchQuery), "others")}

              {/* No results for Others */}
              {searchQuery && filterMenuItems(othersItems, searchQuery).length === 0 && (
                <div className="text-sm text-gray-400 text-center py-4">
                  No items found
                </div>
              )}
            </div>
          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;

