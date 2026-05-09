"use client";
import { useEffect, useState } from "react";
import { Input } from "antd";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CommonButton from "@/app/_components/_common-button/CommonButton";
import { useSelector } from "react-redux";
import { InfinitySpin } from "react-loader-spinner";
import apiUrl from "@/app/_host/apiURL";

const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN;
const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN;

const BeverageForm = () => {
  let data = useSelector((state) => state);
  let [branch, setBranch] = useState(
    data.userData.userInfo && data.userData.userInfo.branchName,
  );
  let [updateButton, setUpdateButton] = useState(false);
  const [beverageData, setBeverageData] = useState({
    name: "",
    branch: data.userData.userInfo && data.userData.userInfo.branchName,
  });
  let [dataReFatch, setDataReFatch] = useState(false);

  const handleChange = (value, field) => {
    setUpdateButton(true);
    setBeverageData({ ...beverageData, [field]: value });
  };

  const handleSubmit = () => {
    axios
      .post(`${apiUrl}/api/v1/add-menu/beverage`, beverageData, {
        auth: { username: "user", password: postToken },
      })
      .then((res) => {
        if (res.data.message === "Your Beverage Item Successfully Created!!") {
          toast.success(res.data.message);
          setBeverageData({
            name: "",
            branch: data.userData.userInfo && data.userData.userInfo.branchName,
          });
          setDataReFatch(!dataReFatch);
        } else {
          toast.error(res.data.message);
        }
      })
      .catch((error) => {
        toast.error("Error adding beverage. Please try again.");
      });
  };

  // delete beverage function
  let handleDelete = (_id) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/deletebeverage`,
        {
          id: _id,
        },
        { auth: { username: "user", password: postToken } },
      )
      .then(() => {
        setDataReFatch(!dataReFatch);
      });
  };

  // get all beverages
  let [allBeverages, setAllBeverages] = useState([]);
  useEffect(() => {
    axios
      .get(`${apiUrl}/api/v1/add-menu/getbeverage`, {
        auth: {
          username: "user",
          password: getToken,
        },
      })
      .then((res) => {
        setAllBeverages(res.data);
      });
  }, [dataReFatch]);

  // Date format function
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
  let [edit, setEdit] = useState(false);
  let [editID, setEditID] = useState("");
  let [editItem, setEditItem] = useState();
  let handleEdit = (item, index) => {
    setUpdateButton(false);
    setEdit(true);
    setEditID(item._id);
    setEditItem(item.name);

    // Scroll to the top of the page
    window.scrollTo({ top: 0, behavior: "smooth" });

    setBeverageData({
      name: item.name,
    });
  };

  let handleCancelEdit = () => {
    setUpdateButton(false);
    setEdit(false);
    setEditID("");
    setEditItem("");
    setBeverageData({
      name: "",
      branch: data.userData.userInfo && data.userData.userInfo.branchName,
    });
  };

  // update the beverage data from database
  let handleUpdate = () => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/updatebeverage`,
        {
          id: editID,
          updatedBeverage: beverageData,
        },
        { auth: { username: "user", password: postToken } },
      )
      .then((res) => {
        if (res.data.message === "Your Beverage Item Successfully Updated!!") {
          toast.success(res.data.message);
          setBeverageData({
            name: "",
            branch: data.userData.userInfo && data.userData.userInfo.branchName,
          });
          setDataReFatch(!dataReFatch);
        } else {
          toast.error(res.data.message);
        }
      })
      .catch((error) => {
        toast.error("Error updating beverage. Please try again.");
      });
  };

  // Beverage available status functionality

  let handleNotAvailable = (_id) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/beveragestatus`,
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
        `${apiUrl}/api/v1/add-menu/beveragestatus`,
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
          Update your Beverage item - {editItem}
        </h3>
      ) : (
        <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
          Add your Beverage items
        </h3>
      )}
      <Input
        placeholder="Beverage Name"
        value={beverageData.name}
        onChange={(e) => handleChange(e.target.value, "name")}
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
          Manage your all Beverage items from here
        </h3>
        <div className="flex flex-col-reverse flex-wrap justify-center w-full gap-5 mt-5 md:flex-row">
          {allBeverages &&
            allBeverages.map(
              (item, index) =>
                item.branch === branch && (
                  <div className="w-full p-3 md:w-[32%] bg-p-yellow flex flex-col gap-y-3">
                    <h4 className="text-[20px] mt-3 text-p-red font-semibold capitalize ">
                      {item.name}
                    </h4>

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

export default BeverageForm;
