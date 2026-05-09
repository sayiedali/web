import LogoMenuNav from "./_add-logo-menu-nav/LogoMenuNav";

export default function AddLogoLayout({ children }) {
  return (
    <>
      <div className="pt-[80px] p-[10px] w-full">
        <h3 className="text-center uppercase font-semibold text-p-brown text-[20px] mb-10">
          Manage your all logo from here
        </h3>
        <LogoMenuNav />
        {children}
      </div>
    </>
  );
}
