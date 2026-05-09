"use client";
import React, { useEffect, useState } from "react";
import { Select, Input } from "antd";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CommonButton from "@/app/_components/_common-button/CommonButton";
import { InfinitySpin } from "react-loader-spinner";
import { useSelector } from "react-redux";
import apiUrl from "@/app/_host/apiURL";

const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN;
const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN;
const { Option } = Select;
const parseApiError = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const parseNumeric = (value) => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

const WingsForm = () => {
  let data = useSelector((state) => state);
  let [branch, setBranch] = useState(
    data.userData.userInfo && data.userData.userInfo.branchName,
  );
  let [updateButton, setUpdateButton] = useState(false);
  const [wingsData, setWingsData] = useState({
    name: "",
    description: "",
    image: "",
    pieces: "",
    tossedIn: [],
    prices: "",
    branch: data.userData.userInfo && data.userData.userInfo.branchName,
  });
  let [dataReFatch, setDataReFatch] = useState(false);
  // edit functionalities
  let [edit, setEdit] = useState(false);
  let [editID, setEditID] = useState("");
  let [editItem, setEditItem] = useState();

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
    setWingsData({ ...wingsData, [field]: value });
  };

  const handleSubmit = () => {
    const payload = {
      ...wingsData,
      image: imageBase64Data,
      branch: wingsData.branch || branch,
      prices: parseNumeric(wingsData.prices),
      pieces: parseNumeric(wingsData.pieces),
    };

    axios
      .post(
        `${apiUrl}/api/v1/add-menu/wings`,
        payload,
        {
          auth: { username: "user", password: postToken },
        },
      )
      .then((res) => {
        if (res?.data?.success === false) {
          toast.error(res?.data?.message || "Unable to create wings item.");
          return;
        }

        toast.success(res?.data?.message || "Wings item created.");
          setWingsData({
            name: "",
            description: "",
            image: "",
            pieces: "",
            tossedIn: [],
            prices: "",
            branch: data.userData.userInfo && data.userData.userInfo.branchName,
          });
          setImageBase64Data("");
          setDataReFatch(!dataReFatch);
      })
      .catch((error) => {
        toast.error(parseApiError(error, "Error adding wings. Please try again."));
      });
  };

  // delete wings function
  let handleDelete = (_id) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/deletewings`,
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

  // get all wings
  let [allWings, setAllWings] = useState([]);
  useEffect(() => {
    axios
      .get(`${apiUrl}/api/v1/add-menu/getwings`, {
        auth: {
          username: "user",
          password: getToken,
        },
      })
      .then((res) => {
        setAllWings(res.data);
      });
  }, [dataReFatch]);

  // tossedIn array
  const tossedInOptions = [
    "Screamin'Hot",
    "BBQ",
    "Honey Garlic",
    "Salt & Pepper",
    "Lemon Pepper",
    "Teriyaki",
    "Sweet Chili",
    "Mild Sauce",
  ];

  let handleEdit = (item, index) => {
    setUpdateButton(false);
    setEdit(true);
    setEditID(item._id);
    setEditItem(item);

    // Scroll to the top of the page
    window.scrollTo({ top: 0, behavior: "smooth" });

    setWingsData({
      name: item.name,
      description: item.description,
      image: "",
      pieces: item.pieces,
      tossedIn: item.tossedIn,
      prices: item.prices,
      branch: item.branch || branch,
    });
  };

  let handleCancelEdit = () => {
    setUpdateButton(false);
    setEdit(false);
    setEditID("");
    setEditItem("");
    setWingsData({
      name: "",
      description: "",
      image: "",
      pieces: "",
      tossedIn: [],
      prices: "",
      branch: data.userData.userInfo && data.userData.userInfo.branchName,
    });
  };

  // update the wings data from database
  let handleUpdate = () => {
    const updatedWingsPayload = {
      ...wingsData,
      image: imageBase64Data || editItem?.image || "",
      branch: wingsData.branch || branch,
      prices: parseNumeric(wingsData.prices),
      pieces: parseNumeric(wingsData.pieces),
    };

    axios
      .post(
        `${apiUrl}/api/v1/add-menu/updatewings`,
        {
          id: editID,
          updatedWings: updatedWingsPayload,
        },
        { auth: { username: "user", password: postToken } },
      )
      .then((res) => {
        if (res?.data?.success === false) {
          toast.error(res?.data?.message || "Unable to update wings item.");
          return;
        }

        toast.success(res?.data?.message || "Wings item updated.");
          setWingsData({
            name: "",
            description: "",
            image: "",

            pieces: "",

            tossedIn: [],
            prices: "",
            branch: data.userData.userInfo && data.userData.userInfo.branchName,
          });

          setUpdateButton(false);
          setEdit(false);
          setEditID("");
          setImageBase64Data("");

          setDataReFatch(!dataReFatch);
      })
      .catch((error) => {
        toast.error(parseApiError(error, "Error updating wings. Please try again."));
      });
  };

  let handleNotAvailable = (_id) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/wingsstatus`,
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
        `${apiUrl}/api/v1/add-menu/wingsstatus`,
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

  return (
    <div className="flex flex-col w-full gap-5 mx-auto mt-10">
      {editItem ? (
        <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
          Update your wings item - {editItem.name} {` (${editItem.pieces})`} Pcs
        </h3>
      ) : (
        <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
          Add your wings items
        </h3>
      )}
      <Input
        placeholder="Wings Name"
        value={wingsData.name}
        onChange={(e) => handleChange(e.target.value, "name")}
      />
      <Input.TextArea
        placeholder="Wings Description"
        value={wingsData.description}
        onChange={(e) => handleChange(e.target.value, "description")}
      />

      <Input
        placeholder="Image URL"
        type="file"
        value={wingsData.image}
        onChange={handleFileChange}
      />

      <div className="flex gap-4">
        <Select
          mode="tags"
          style={{ width: "100%" }}
          placeholder="Select Tossed In"
          onChange={(value) => handleChange(value, "tossedIn")}
          value={wingsData.tossedIn}
        >
          {tossedInOptions.map((item) => (
            <Option key={item} value={item}>
              {item}
            </Option>
          ))}
        </Select>
        <Input
          placeholder="Pieces"
          type="number"
          value={wingsData.pieces}
          onChange={(e) => handleChange(e.target.value, "pieces")}
        />
      </div>
      <Input
        placeholder="Wings Price (CAD)"
        type="number"
        value={wingsData.prices}
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
          Manage your all wings items from here
        </h3>
        <div className="flex flex-col-reverse flex-wrap justify-center w-full gap-5 mt-5 md:flex-row">
          {allWings &&
            allWings.map(
              (item, index) =>
                item.branch === branch && (
                  <div className="w-full p-3 md:w-[32%] bg-p-yellow flex flex-col gap-y-3">
                    <img src={item.image} className="w-full h-auto" />

                    <h4 className="text-[20px] text-p-red font-semibold capitalize ">
                      {item.name} ({item.pieces && item.pieces}Pcs)
                    </h4>
                    <p className="text-[12px] text-p-brown">
                      {item.description}
                    </p>
                    <div className="">
                      <h4 className="text-[17px] mb-2 text-p-red font-semibold capitalize ">
                        Tossed In
                      </h4>
                      <ul className="flex flex-wrap gap-3">
                        {item.tossedIn.map((item, index) => (
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
                        created: {formatDateTime(item.createdAt)}
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

export default WingsForm;
