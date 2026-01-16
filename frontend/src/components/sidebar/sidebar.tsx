export default function Sidebar({isOpen , data , isMobile} : {isOpen: boolean , data: any[] , isMobile: boolean}) {
  return (
    <div className={` border-r border-gray-200 h-screen ${isMobile && !isOpen ? "w-0" : isOpen ? "w-64" : "w-20"} transition-all duration-300 ease-in-out`}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-2">
          <h1> Sidebar </h1>
 
        </div>
      </div>
   
    </div>
  );
}


