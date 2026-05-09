"use client";
import { useEffect, useState } from "react";
import { Input } from "antd";
import axios from "axios";
import { toast } from "react-toastify";
import CommonButton from "@/app/_components/_common-button/CommonButton";
import { InfinitySpin, ThreeDots } from "react-loader-spinner";
import apiUrl from "@/app/_host/apiURL";

const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN;
const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN;

// date format function
const formatDateTime = (createdAt) => {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  return new Date(createdAt).toLocaleDateString(undefined, options);
};

const HeaderLogoForm = () => {
  const [logoData, setLogoData] = useState({
    logoUrl: "",
    image: "",
  });
  let [edit, setEdit] = useState(false);
  let [showLoader, setShowLoader] = useState(false);
  let [showLoaderT, setShowLoaderT] = useState(false);
  let [editID, setEditID] = useState("");
  let [editItem, setEditItem] = useState();

  let [updateButton, setUpdateButton] = useState(false);
  let [dataReFatch, setDataReFatch] = useState(false);

  const [imageBase64Data, setImageBase64Data] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target.result;
        setImageBase64Data(base64Data);
      };

      reader.readAsDataURL(file);
    }

    if (edit) {
      setUpdateButton(true);
    }
  };

  const handleChange = (value, field) => {
    setUpdateButton(true);
    setLogoData({ ...logoData, [field]: value });
  };

  const handleSubmit = () => {
    setShowLoader(true);
    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: `${apiUrl}/api/v1/logo/header-logo/create`,
      headers: {
        "Content-Type": "application/json",
      },
      auth: {
        username: "user",
        password: postToken,
      },
      data: { ...logoData, image: imageBase64Data },
    };

    axios
      .request(config)
      .then((res) => {
        if (res.data.message === "Header Logo Successfully Created!") {
          setShowLoader(false);
          toast.success(res.data.message);
          setLogoData({
            logoUrl: "",
            image: "",
          });
          setImageBase64Data("");
          setDataReFatch(!dataReFatch);
        } else {
          setShowLoader(false);

          toast.error(res.data.message);
        }
      })
      .catch((error) => {
        setShowLoader(false);

        toast.error("Error adding header logo. Please try again.");
      });
  };

  let handleDelete = (_id) => {
    setShowLoaderT(true);
    setEditID(_id);

    axios
      .post(
        `${apiUrl}/api/v1/logo/header-logo/delete`,
        {
          id: _id,
        },
        { auth: { username: "user", password: postToken } },
      )
      .then(() => {
        toast.success("Item deleted successfully");
        setDataReFatch(!dataReFatch);
        setShowLoaderT(false);
        setEditID("");
      });
  };

  let [allLogo, setAllLogo] = useState([]);

  useEffect(() => {
    axios
      .get(`${apiUrl}/api/v1/logo/header-logo/all`, {
        auth: {
          username: "user",
          password: getToken,
        },
      })
      .then((res) => {
        setAllLogo(res.data);
      });
  }, [dataReFatch]);

  let handleEdit = (item, index) => {
    setUpdateButton(false);
    setEdit(true);
    setEditID(item._id);
    setEditItem(item.logoUrl);

    // Scroll to the top of the page
    window.scrollTo({ top: 0, behavior: "smooth" });

    setLogoData({
      logoUrl: item.logoUrl,
      image: "",
    });
  };

  let handleCancelEdit = () => {
    setUpdateButton(false);
    setEdit(false);
    setEditID("");
    setEditItem("");
    setLogoData({
      logoUrl: "",
      image: "",
    });
  };

  let handleUpdate = () => {
    setShowLoader(true);
    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: `${apiUrl}/api/v1/logo/header-logo/update`,
      headers: {
        "Content-Type": "application/json",
      },
      auth: {
        username: "user",
        password: postToken,
      },
      data: {
        id: editID,
        updatedHeaderLogo: { ...logoData, image: imageBase64Data },
      },
    };

    axios
      .request(config)
      .then((res) => {
        if (res.data.message === "Header Logo Successfully Updated!") {
          setEdit(false);
          setShowLoader(false);
          setEditID("");
          toast.success(res.data.message);
          setLogoData({
            logoUrl: "",
            image: "",
          });
          setImageBase64Data("");
          setDataReFatch(!dataReFatch);
        } else {
          setShowLoader(false);
          toast.error(res.data.message);
        }
      })
      .catch((error) => {
        setShowLoader(false);
        toast.error("Error updating header logo. Please try again.");
      });
  };

  return (
    <div className="flex flex-col w-full gap-5 mx-auto mt-10">
      {editItem ? (
        <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
          Update Exist Header Logo
        </h3>
      ) : (
        <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
          Add New Header Logo
        </h3>
      )}
      <Input
        placeholder="Logo URL"
        value={logoData.logoUrl}
        onChange={(e) => handleChange(e.target.value, "logoUrl")}
      />
      <Input
        placeholder="Image URL"
        type="file"
        value={logoData.image}
        onChange={handleFileChange}
      />

      <div className="flex justify-center">
        {edit ? (
          showLoader ? (
            <div className="flex items-center justify-center">
              <ThreeDots
                visible={true}
                width="80"
                color="#005B89"
                radius="9"
                ariaLabel="three-dots-loading"
                wrapperStyle={{}}
                wrapperClass=""
              />
            </div>
          ) : (
            <div className="flex gap-3">
              {updateButton && (
                <CommonButton title={"Update"} onClick={handleUpdate} />
              )}
              <CommonButton title={"Cancel Edit"} onClick={handleCancelEdit} />
            </div>
          )
        ) : showLoader ? (
          <CommonButton title={"Loading..."} onClick={() => {}} />
        ) : (
          <CommonButton title={"Submit"} onClick={handleSubmit} />
        )}
      </div>

      <div className="w-full mt-10">
        <div className="flex flex-col-reverse flex-wrap justify-center w-full gap-5 mt-5 md:flex-row">
          {allLogo &&
            allLogo.map((item, index) => (
              <div className="w-full p-3 md:w-[32%] bg-p-yellow flex flex-col gap-y-3">
                <img src={item.image} className="w-full h-auto" />

                <h4 className="text-[20px] mt-3 text-p-red font-semibold capitalize ">
                  {item.logoUrl}
                </h4>
                <div className="">
                  <small className="font-semibold text-p-brown">
                    Last Update: {formatDateTime(item.updatedAt)}
                  </small>
                </div>
                <div className="flex justify-center gap-3 mt-5">
                  {(edit || showLoaderT) && editID === item._id ? (
                    <InfinitySpin
                      visible={true}
                      width="200"
                      color="#005B89"
                      ariaLabel="infinity-spin-loading"
                    />
                  ) : (
                    <>
                      <div
                        onClick={() => handleEdit(item, index)}
                        className="p-2 rounded-xl text-white cursor-pointer duration-300 hover:opacity-[0.7] bg-green-700"
                      >
                        Edit
                      </div>
                      <div
                        onClick={() => handleDelete(item._id)}
                        className="p-2 rounded-xl text-white cursor-pointer duration-300 hover:opacity-[0.7] bg-red-500"
                      >
                        Delete
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default HeaderLogoForm;
