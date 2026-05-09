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

const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN;
const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN;
const { Option } = Select;

const SpecialityPastaForm = () => {
  const data = useSelector((state) => state);
  const [branch, setBranch] = useState(
    data.userData.userInfo && data.userData.userInfo.branchName,
  );
  const [updateButton, setUpdateButton] = useState(false);
  const [specialityPastaData, setSpecialityPastaData] = useState({
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

  const servedWithOptions = ["GARLIC TOAST"];
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
    setSpecialityPastaData({ ...specialityPastaData, [field]: value });
  };

  const handlePriceChange = (value, size) => {
    setUpdateButton(true);
    setSpecialityPastaData({
      ...specialityPastaData,
      prices: {
        ...specialityPastaData.prices,
        [size]: value,
      },
    });
  };

  const handleSubmit = () => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/specialtypasta`,
        { ...specialityPastaData, image: imageBase64Data },
        {
          auth: { username: "user", password: postToken },
        },
      )
      .then((res) => {
        if (
          res.data.message ===
          "Your Specialty Pasta Item Successfully Created!!"
        ) {
          toast.success(res.data.message);
          setSpecialityPastaData({
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
        toast.error("Error adding speciality pasta. Please try again.");
      });
  };

  const handleDelete = (_id) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/deletespecialtypasta`,
        {
          id: _id,
        },
        { auth: { username: "user", password: postToken } },
      )
      .then(() => {
        toast.success("Speciality pasta Item deleted successfully");
        setDataReFatch(!dataReFatch);
      });
  };

  const [allSpecialityPastas, setAllSpecialityPastas] = useState([]);
  useEffect(() => {
    axios
      .get(`${apiUrl}/api/v1/add-menu/getspecialtypastas`, {
        auth: {
          username: "user",
          password: getToken,
        },
      })
      .then((res) => {
        setAllSpecialityPastas(res.data);
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

    setSpecialityPastaData({
      name: item.name,
      description: item.description,
      image: "",
      servedWith: item.servedWith,
      prices: {
        medium: item.prices.medium,
        large: item.prices.large,
      },
    });
  };

  const handleCancelEdit = () => {
    setUpdateButton(false);
    setEdit(false);
    setEditID("");
    setEditItem("");
    setSpecialityPastaData({
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
  };

  const handleUpdate = () => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/updatespecialtypasta`,
        {
          id: editID,
          updatedSpecialtyPasta: {
            ...specialityPastaData,
            image: imageBase64Data,
          },
        },
        { auth: { username: "user", password: postToken } },
      )
      .then((res) => {
        if (
          res.data.message ===
          "Your Specialty Pasta Item Successfully Updated!!"
        ) {
          toast.success(res.data.message);
          setSpecialityPastaData({
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
        toast.error("Error updating speciality pasta. Please try again.");
      });
  };

  // panzarotti available status functionality
  let handleNotAvailable = (_id) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/specialtypastastatus`,
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
        `${apiUrl}/api/v1/add-menu/specialtypastastatus`,
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
          Update your speciality pasta item - {editItem.name}
        </h3>
      ) : (
        <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
          Add your speciality pasta items
        </h3>
      )}
      <Input
        placeholder="Speciality Pasta Name"
        value={specialityPastaData.name}
        onChange={(e) => handleChange(e.target.value, "name")}
      />
      <Input
        placeholder="Speciality Pasta Description"
        value={specialityPastaData.description}
        onChange={(e) => handleChange(e.target.value, "description")}
      />

      <Input
        placeholder="Image URL"
        type="file"
        value={specialityPastaData.image}
        onChange={handleFileChange}
      />

      <Select
        mode="tags"
        style={{ width: "100%" }}
        placeholder="Served With"
        onChange={(value) => handleChange(value, "servedWith")}
        value={specialityPastaData.servedWith}
      >
        {servedWithOptions.map((item) => (
          <Option key={item} value={item}>
            {item}
          </Option>
        ))}
        {/* Add options for "Served With" here */}
      </Select>
      <p className="text-p-red">Add Prices (CAD)</p>
      <div className="flex flex-wrap gap-1">
        <Input
          placeholder="Medium Speciality Pasta Price"
          type="number"
          className="w-[49%]"
          value={specialityPastaData.prices.medium}
          onChange={(e) => handlePriceChange(e.target.value, "medium")}
        />
        <Input
          placeholder="Large Speciality Pasta Price"
          type="number"
          className="w-[49%]"
          value={specialityPastaData.prices.large}
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
          Manage your all speciality pasta items from here
        </h3>
        <div className="flex flex-col-reverse flex-wrap justify-center w-full gap-5 mt-5 md:flex-row">
          {allSpecialityPastas.map(
            (item, index) =>
              item.branch === branch && (
                <div className="w-full p-3 md:w-[32%] bg-p-yellow flex flex-col gap-y-3">
                  <img src={item.image} className="w-full h-auto" />

                  <h4 className="text-[20px] text-p-red mt-3 font-semibold capitalize ">
                    {item.name}
                  </h4>
                  <small className="text-p-brown">{item.description}</small>
                  <div className="">
                    <h4 className="text-[17px] mb-2 text-p-red font-semibold capitalize ">
                      Served With
                    </h4>
                    <ul className="flex flex-wrap gap-3">
                      {item.servedWith.map((servedWithItem, index) => (
                        <li className="p-1 rounded-lg text-[10px] text-white bg-green-700">
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

export default SpecialityPastaForm;
