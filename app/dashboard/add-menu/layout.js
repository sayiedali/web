import AddMenuNav from "./_add-menu-nav/AddMenuNav";

export default function AddMenuLayout({ children }) {
  return (
    <>
      {/* Include shared UI here e.g. a header or sidebar */}
      <div className="pt-[80px] p-[10px] w-full">
        <h3 className="text-center uppercase font-semibold text-p-brown text-[20px] mb-10">
          Manage your all menu items from here
        </h3>
        <AddMenuNav/>

        {children}
      </div>
    </>
  );
}
