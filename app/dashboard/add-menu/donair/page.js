"use client";
import { useEffect, useState } from "react";
import { Select, Input } from "antd";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CommonButton from "@/app/_components/_common-button/CommonButton";
import { useSelector } from "react-redux";
import { InfinitySpin } from "react-loader-spinner";
import apiUrl from "@/app/_host/apiURL";
import useToppingsOptions from "@/app/dashboard/add-menu/_hooks/useToppingsOptions";

const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN;
const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN;
const { Option } = Select;

const DonairForm = () => {
  let data = useSelector((state) => state);
  let [branch, setBranch] = useState(
    data.userData.userInfo && data.userData.userInfo.branchName,
  );
  let [updateButton, setUpdateButton] = useState(false);
  const [donairData, setDonairData] = useState({
    name: "",
    description: "",
    image: "",
    toppings: [],
    prices: "",
    branch: data.userData.userInfo && data.userData.userInfo.branchName,
  });

  let [edit, setEdit] = useState(false);
  let [editID, setEditID] = useState("");
  let [editItem, setEditItem] = useState();

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
    setDonairData({ ...donairData, [field]: value });
  };

  const handleSubmit = () => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/donair`,
        { ...donairData, image: imageBase64Data },
        {
          auth: { username: "user", password: postToken },
        },
      )
      .then((res) => {
        if (res.data.message === "Your Donair Item Successfully Created!!") {
          toast.success(res.data.message);
          setDonairData({
            name: "",
            description: "",
            image: "",
            toppings: [],
            prices: 0,
            branch: data.userData.userInfo && data.userData.userInfo.branchName,
          });
          setImageBase64Data("");
          setDataReFatch(!dataReFatch);
        } else {
          toast.error(res.data.message);
        }
      })
      .catch((error) => {
        toast.error("Error adding donair. Please try again.");
      });
  };

  // delete donair function
  let handleDelete = (_id) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/deletedonair`,
        {
          id: _id,
        },
        { auth: { username: "user", password: postToken } },
      )
      .then(() => {
        toast.success("Item deleted successfully");
        setDataReFatch(!dataReFatch);
      });
  };

  // get all donairs
  let [allDonairs, setAllDonairs] = useState([]);
  useEffect(() => {
    axios
      .get(`${apiUrl}/api/v1/add-menu/getdonair`, {
        auth: {
          username: "user",
          password: getToken,
        },
      })
      .then((res) => {
        setAllDonairs(res.data);
      });
  }, [dataReFatch]);

  const { toppingsOptions: toppings } = useToppingsOptions({
    branch,
    fallback: ["LETTUCE", "TOMATOES", "ONIONS"],
  });

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

  // edit functionalities

  let handleEdit = (item, index) => {
    setUpdateButton(false);
    setEdit(true);
    setEditID(item._id);
    setEditItem(item.name);

    // Scroll to the top of the page
    window.scrollTo({ top: 0, behavior: "smooth" });

    setDonairData({
      name: item.name,
      description: item.description,
      image: "",
      toppings: item.toppings,
      prices: item.prices,
    });
  };

  let handleCancelEdit = () => {
    setUpdateButton(false);
    setEdit(false);
    setEditID("");
    setEditItem("");
    setDonairData({
      name: "",
      description: "",
      image: "",
      toppings: [],
      prices: "",
      branch: data.userData.userInfo && data.userData.userInfo.branchName,
    });
  };

  // update the donair data from database
  let handleUpdate = () => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/updatedonair`,
        {
          id: editID,
          updatedDonair: { ...donairData, image: imageBase64Data },
        },
        { auth: { username: "user", password: postToken } },
      )
      .then((res) => {
        if (res.data.message === "Your Donair Item Successfully Updated!!") {
          toast.success(res.data.message);
          setDonairData({
            name: "",
            description: "",
            image: "",
            toppings: [],
            prices: "",
            branch: data.userData.userInfo && data.userData.userInfo.branchName,
          });

          setUpdateButton(false);
          setEdit(false);
          setEditID("");
          setImageBase64Data("");

          setDataReFatch(!dataReFatch);
        } else {
          toast.error(res.data.message);
        }
      })
      .catch((error) => {
        toast.error("Error updating donair. Please try again.");
      });
  };

  let handleNotAvailable = (_id) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/donairstatus`,
        {
          id: _id,
          status: "not-available",
        },
        { auth: { username: "user", password: postToken } },
      )
      .then(() => {
        setDataReFatch(!dataReFatch);
      });
  };

  let handleAvailable = (_id) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/donairstatus`,
        {
          id: _id,
          status: "available",
        },
        { auth: { username: "user", password: postToken } },
      )
      .then(() => {
        setDataReFatch(!dataReFatch);
      });
  };

  return (
    <div className="flex flex-col w-full gap-5 mx-auto mt-10">
      {editItem ? (
        <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
          Update your donair item - {editItem}
        </h3>
      ) : (
        <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
          Add your donair items
        </h3>
      )}
      <Input
        placeholder="Donair Name"
        value={donairData.name}
        onChange={(e) => handleChange(e.target.value, "name")}
      />
      <Input.TextArea
        placeholder="Donair Description"
        value={donairData.description}
        onChange={(e) => handleChange(e.target.value, "description")}
      />

      <Input
        placeholder="Image URL"
        type="file"
        value={donairData.image}
        onChange={handleFileChange}
      />

      <Select
        mode="tags"
        style={{ width: "100%" }}
        placeholder="Select Toppings"
        onChange={(value) => handleChange(value, "toppings")}
        value={donairData.toppings}
      >
        {toppings.map((item) => (
          <Option key={item} value={item}>
            {item}
          </Option>
        ))}
      </Select>
      <Input
        placeholder="Donair Price (CAD)"
        type="number"
        value={donairData.prices}
        onChange={(e) => handleChange(e.target.value, "prices")}
      />

      <div className="flex justify-center">
        {edit ? (
          <div className="flex gap-3">
            {updateButton && (
              <CommonButton title={"Update"} onClick={handleUpdate} />
            )}
            <CommonButton title={"Cancel Edit"} onClick={handleCancelEdit} />
          </div>
        ) : (
          <CommonButton title={"Submit"} onClick={handleSubmit} />
        )}
      </div>
      <div className="w-full mt-10">
        <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
          Manage your all donair items from here
        </h3>
        <div className="flex flex-col-reverse flex-wrap justify-center w-full gap-5 mt-5 md:flex-row">
          {allDonairs &&
            allDonairs.map(
              (item, index) =>
                item.branch === branch && (
                  <div className="w-full p-3 md:w-[32%] bg-p-yellow flex flex-col gap-y-3">
                    <img src={item.image} className="w-full h-auto" />

                    <h4 className="text-[20px] mt-3 text-p-red font-semibold capitalize ">
                      {item.name}
                    </h4>
                    <p className="text-[12px] text-p-brown">
                      {item.description}
                    </p>
                    <div className="">
                      <h4 className="text-[17px] mb-2 text-p-red font-semibold capitalize ">
                        Toppings
                      </h4>
                      <ul className="flex flex-wrap gap-3">
                        {item.toppings.map((item, index) => (
                          <li className="p-1 rounded-lg text-[10px] text-white bg-green-700">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="">
                      <h4 className="text-[17px]  text-p-red font-semibold capitalize ">
                        Price (CAD)
                      </h4>
                      <p className="text-p-brown">{item.prices}</p>
                    </div>
                    <div className="text-end">
                      <small className="font-semibold text-p-brown">
                        Created: {formatDateTime(item.createdAt)}
                      </small>
                      <br />
                      <small className="font-semibold text-p-brown">
                        Last Update: {formatDateTime(item.updatedAt)}
                      </small>
                    </div>
                    <div className="flex justify-center gap-3 mt-5">
                      {edit && item._id === editID ? (
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
                          {item.isAvailable === "not-available" ? (
                            <div
                              onClick={() => handleAvailable(item._id)}
                              className="p-2 rounded-xl text-white cursor-pointer duration-300 hover:opacity-[0.7] bg-p-blue"
                            >
                              Available
                            </div>
                          ) : (
                            <div
                              onClick={() => handleNotAvailable(item._id)}
                              className="p-2 rounded-xl text-white cursor-pointer duration-300 hover:opacity-[0.7] bg-p-red"
                            >
                              Not Available
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ),
            )}
        </div>
      </div>
    </div>
  );
};

export default DonairForm;
