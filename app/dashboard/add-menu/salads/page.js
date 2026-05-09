"use client";
import { useEffect, useState } from "react";
import { Input, Select } from "antd";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CommonButton from "@/app/_components/_common-button/CommonButton";
import { InfinitySpin } from "react-loader-spinner";
import { useSelector } from "react-redux";
import apiUrl from "@/app/_host/apiURL";

const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN;
const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN;
const { Option } = Select;

const SaladForm = () => {
  const data = useSelector((state) => state);
  const [branch, setBranch] = useState(
    data.userData.userInfo && data.userData.userInfo.branchName,
  );
  const [updateButton, setUpdateButton] = useState(false);
  const [saladData, setSaladData] = useState({
    name: "",
    description: "",
    image: "",
    servedWith: [],
    prices: {
      medium: "",
      large: "",
    },
    branch: data.userData.userInfo && data.userData.userInfo.branchName,
  });
  const servedWith = ["GARLIC TOAST"];

  const [edit, setEdit] = useState(false);
  const [editID, setEditID] = useState("");
  const [editItem, setEditItem] = useState();
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

    setSaladData({ ...saladData, [field]: value });
  };

  const handlePriceChange = (value, size) => {
    setUpdateButton(true);
    setSaladData({
      ...saladData,
      prices: {
        ...saladData.prices,
        [size]: value,
      },
    });
  };

  const handleSubmit = () => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/salad`,
        { ...saladData, image: imageBase64Data },
        {
          auth: { username: "user", password: postToken },
        },
      )
      .then((res) => {
        if (res.data.message === "Your Salad Item Successfully Created!!") {
          toast.success(res.data.message);
          setSaladData({
            name: "",
            description: "",
            image: "",
            servedWith: [],
            prices: {
              medium: "",
              large: "",
            },
            branch: data.userData.userInfo && data.userData.userInfo.branchName,
          });

          setImageBase64Data("");
          setDataReFatch(!dataReFatch);
        } else {
          toast.error(res.data.message);
        }
      })
      .catch((error) => {
        toast.error("Error adding salad. Please try again.");
      });
  };

  const handleDelete = (_id) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/deletesalad`,
        {
          id: _id,
        },
        { auth: { username: "user", password: postToken } },
      )
      .then(() => {
        toast.success("Salad item deleted successfully.");
        setDataReFatch(!dataReFatch);
      });
  };

  const [allSalads, setAllSalads] = useState([]);
  useEffect(() => {
    axios
      .get(`${apiUrl}/api/v1/add-menu/getsalads`, {
        auth: {
          username: "user",
          password: getToken,
        },
      })
      .then((res) => {
        setAllSalads(res.data);
      });
  }, [dataReFatch]);

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

  const handleEdit = (item, index) => {
    setUpdateButton(false);
    setEdit(true);
    setEditID(item._id);
    setEditItem(item);

    window.scrollTo({ top: 0, behavior: "smooth" });

    setSaladData({
      name: item.name,
      description: item.description,
      servedWith: item.servedWith,
      prices: {
        medium: item.prices.medium,
        large: item.prices.large,
      },
      image: "",
    });
  };

  const handleCancelEdit = () => {
    setUpdateButton(false);
    setEdit(false);
    setEditID("");
    setEditItem("");
    setSaladData({
      name: "",
      description: "",
      servedWith: [],
      prices: {
        medium: "",
        large: "",
      },
      image: "",
      branch: data.userData.userInfo && data.userData.userInfo.branchName,
    });
  };

  const handleUpdate = () => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/updatesalad`,
        {
          id: editID,
          updatedSalad: { ...saladData, image: imageBase64Data },
        },
        { auth: { username: "user", password: postToken } },
      )
      .then((res) => {
        if (res.data.message === "Your Salad Item Successfully Updated!!") {
          toast.success(res.data.message);
          setSaladData({
            name: "",
            description: "",
            servedWith: [],
            prices: {
              medium: "",
              large: "",
            },
            image: "",
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
        toast.error("Error updating salad. Please try again.");
      });
  };

  const handleNotAvailable = (_id) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/saladstatus`,
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

  const handleAvailable = (_id) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/saladstatus`,
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
          Update your salad item - {editItem.name}
        </h3>
      ) : (
        <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
          Add your salad items
        </h3>
      )}
      <Input
        placeholder="Salad Name"
        value={saladData.name}
        onChange={(e) => handleChange(e.target.value, "name")}
      />
      <Input.TextArea
        placeholder="Salad Description"
        value={saladData.description}
        onChange={(e) => handleChange(e.target.value, "description")}
      />

      <Input
        placeholder="Image URL"
        type="file"
        value={saladData.image}
        onChange={handleFileChange}
      />

      <Select
        mode="tags"
        style={{ width: "100%" }}
        placeholder="Served With"
        onChange={(value) => handleChange(value, "servedWith")}
        value={saladData.servedWith}
      >
        {servedWith.map((item) => (
          <Option key={item} value={item}>
            {item}
          </Option>
        ))}
      </Select>

      <p className="text-p-red">Add Prices (CAD)</p>
      <div className="flex flex-wrap gap-1">
        <Input
          placeholder="Medium Salad Price"
          type="number"
          className="w-[49%]"
          value={saladData.prices.medium}
          onChange={(e) => handlePriceChange(e.target.value, "medium")}
        />
        <Input
          placeholder="Large Salad Price"
          type="number"
          className="w-[49%]"
          value={saladData.prices.large}
          onChange={(e) => handlePriceChange(e.target.value, "large")}
        />
      </div>

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
          Manage your all salad items from here
        </h3>
        <div className="flex flex-col-reverse flex-wrap justify-center w-full gap-5 mt-5 md:flex-row">
          {allSalads.map(
            (item, index) =>
              item.branch === branch && (
                <div
                  className="w-full p-3 md:w-[32%] bg-p-yellow flex flex-col gap-y-3"
                  key={index}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-auto"
                  />

                  <h4 className="text-[20px] text-p-red mt-3 font-semibold capitalize ">
                    {item.name}
                  </h4>
                  <div className="">
                    <h4 className="text-[17px] mb-2 text-p-red font-semibold capitalize ">
                      Served With
                    </h4>
                    <ul className="flex flex-wrap gap-3">
                      {item.servedWith.map((servedWithItem, index) => (
                        <li
                          className="p-1 rounded-lg text-[10px] text-white bg-green-700"
                          key={index}
                        >
                          {servedWithItem}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="">
                    <h4 className="text-[17px]  text-p-red font-semibold capitalize ">
                      Prices (CAD)
                    </h4>
                    <ul>
                      <li className="text-p-brown">
                        <span className="font-semibold">Medium:</span>{" "}
                        {item.prices.medium}
                      </li>
                      <li className="text-p-brown">
                        <span className="font-semibold">Large:</span>{" "}
                        {item.prices.large}
                      </li>
                    </ul>
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
                      <div className="flex flex-wrap gap-3">
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
                      </div>
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

export default SaladForm;
